#import <AppKit/AppKit.h>
#import <ApplicationServices/ApplicationServices.h>
#import <Carbon/Carbon.h>
#import <Vision/Vision.h>
static void die(NSString *s) { @throw [NSException exceptionWithName:@"ComputerUse" reason:s userInfo:nil]; }
static id attr(AXUIElementRef e, CFStringRef key) { CFTypeRef value=NULL; if(AXUIElementCopyAttributeValue(e,key,&value)!=kAXErrorSuccess)return nil; return CFBridgingRelease(value); }
static NSMutableDictionary *contextRecord(void) {
 NSRunningApplication *front=NSWorkspace.sharedWorkspace.frontmostApplication;NSMutableDictionary *value=[@{@"ok":@YES,@"application":front.localizedName?:@"",@"bundleId":front.bundleIdentifier?:@"",@"pid":@(front.processIdentifier)} mutableCopy];
 NSArray *windows=CFBridgingRelease(CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly,kCGNullWindowID));
 for(NSDictionary *window in windows){if([window[(__bridge NSString*)kCGWindowOwnerPID] intValue]==front.processIdentifier&&[window[(__bridge NSString*)kCGWindowLayer] intValue]==0){value[@"window"]=@{@"number":window[(__bridge NSString*)kCGWindowNumber],@"bounds":window[(__bridge NSString*)kCGWindowBounds]};break;}}
 return value;
}
static NSMutableDictionary *recognize(NSDictionary *args) {
 NSString *encoded=args[@"image"];if(![encoded isKindOfClass:NSString.class]||encoded.length>6000000)die(@"OCR image missing or oversized");
 NSData *data=[[NSData alloc]initWithBase64EncodedString:encoded options:0];NSImage *image=[[NSImage alloc]initWithData:data];
 CGImageRef cg=[image CGImageForProposedRect:NULL context:nil hints:nil];if(!cg)die(@"Cannot decode OCR image");
 VNRecognizeTextRequest *request=[VNRecognizeTextRequest new];request.recognitionLevel=VNRequestTextRecognitionLevelAccurate;
 request.recognitionLanguages=@[@"zh-Hans",@"en-US"];request.usesLanguageCorrection=YES;
 VNImageRequestHandler *handler=[[VNImageRequestHandler alloc]initWithCGImage:cg options:@{}];NSError *error=nil;
 if(![handler performRequests:@[request] error:&error])die(error.localizedDescription?:@"Local OCR failed");
 NSMutableArray *rows=[NSMutableArray array];for(VNRecognizedTextObservation *observation in request.results){
  if(rows.count>=240)break;VNRecognizedText *candidate=[observation topCandidates:1].firstObject;if(!candidate.string.length)continue;
  CGRect r=observation.boundingBox;
  [rows addObject:@{@"text":[candidate.string substringToIndex:MIN(300,candidate.string.length)],@"confidence":@(candidate.confidence),@"x":@(r.origin.x),@"y":@(1-r.origin.y-r.size.height),@"width":@(r.size.width),@"height":@(r.size.height)}];
 }
 return [@{@"ok":@YES,@"engine":@"macOS Vision (on-device)",@"coordinateSystem":@"normalized image, top-left origin",@"blocks":rows,@"truncated":@(request.results.count>240)} mutableCopy];
}
static void walk(AXUIElementRef e, int depth, NSMutableArray *rows, NSDate *deadline) {
 if(depth>14 || rows.count>=160 || deadline.timeIntervalSinceNow<0)return;
 NSString *role=attr(e,kAXRoleAttribute)?:@""; NSMutableDictionary *row=[@{@"role":role,@"depth":@(depth)} mutableCopy];
 NSArray *fields=@[@"AXTitle",@"AXDescription",@"AXValue"];
 for(NSString *key in fields) { if([key isEqual:@"AXValue"]&&([role isEqual:@"AXSecureTextField"]||[attr(e,kAXSubroleAttribute) isEqual:@"AXSecureTextField"]))continue;
 id value=attr(e,(__bridge CFStringRef)key); if([value isKindOfClass:NSString.class]&&[value length])row[key]=[value substringToIndex:MIN(400,[value length])]; }
 id pos=attr(e,kAXPositionAttribute),size=attr(e,kAXSizeAttribute); CGPoint p; CGSize s;
 if(pos&&CFGetTypeID((__bridge CFTypeRef)pos)==AXValueGetTypeID()&&AXValueGetValue((__bridge AXValueRef)pos,kAXValueCGPointType,&p)){row[@"x"]=@(p.x);row[@"y"]=@(p.y);}
 if(size&&CFGetTypeID((__bridge CFTypeRef)size)==AXValueGetTypeID()&&AXValueGetValue((__bridge AXValueRef)size,kAXValueCGSizeType,&s)){row[@"width"]=@(s.width);row[@"height"]=@(s.height);}
 [rows addObject:row]; id children=attr(e,kAXChildrenAttribute); if([children isKindOfClass:NSArray.class])for(id child in children)walk((__bridge AXUIElementRef)child,depth+1,rows,deadline);
}
static CGPoint point(NSDictionary *a,NSString *x,NSString *y){
 id px=a[x],py=a[y]; if(![px isKindOfClass:NSNumber.class]||![py isKindOfClass:NSNumber.class]||!isfinite([px doubleValue])||!isfinite([py doubleValue]))die(@"Missing finite coordinates");
 CGPoint p=CGPointMake([px doubleValue],[py doubleValue]); CGDirectDisplayID ids[32]; uint32_t count=0;CGGetActiveDisplayList(32,ids,&count); BOOL valid=NO;
 for(int i=0;i<count;i++)if(CGRectContainsPoint(CGDisplayBounds(ids[i]),p))valid=YES;
 if(!valid)die(@"Coordinates outside active displays");return p;
}
static void mouse(CGEventType type,CGPoint p,CGMouseButton button,int count){CGEventRef e=CGEventCreateMouseEvent(NULL,type,p,button);CGEventSetIntegerValueField(e,kCGMouseEventClickState,count);CGEventPost(kCGHIDEventTap,e);CFRelease(e);}
static void key(CGKeyCode code,BOOL down,CGEventFlags flags){CGEventRef e=CGEventCreateKeyboardEvent(NULL,code,down);CGEventSetFlags(e,flags);CGEventPost(kCGHIDEventTap,e);CFRelease(e);}
int main(){@autoreleasepool{NSMutableDictionary *result;int status=0;@try{
 NSData *data=[[NSFileHandle fileHandleWithStandardInput] readDataToEndOfFile];NSDictionary *a=[NSJSONSerialization JSONObjectWithData:data options:0 error:nil];if(![a isKindOfClass:NSDictionary.class])die(@"Invalid JSON");NSString *action=a[@"action"];
 if([action isEqual:@"context"]){result=contextRecord();}
 else if([action isEqual:@"ocr"]){result=recognize(a);}
 else if([action isEqual:@"status"]||[action isEqual:@"request_accessibility"]){BOOL trusted=[action isEqual:@"request_accessibility"]?AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)@{(__bridge NSString*)kAXTrustedCheckOptionPrompt:@YES}):AXIsProcessTrusted();result=[@{@"ok":@YES,@"accessibility":@(trusted),@"screenRecording":@(CGPreflightScreenCaptureAccess())} mutableCopy];}
 else {if(!AXIsProcessTrusted())die(@"需要在系统设置 → 隐私与安全性 → 辅助功能中授权 Tombuddy，然后重试。");
 if([action isEqual:@"release_inputs"]){CGEventRef current=CGEventCreate(NULL);CGPoint p=CGEventGetLocation(current);CFRelease(current);mouse(kCGEventLeftMouseUp,p,kCGMouseButtonLeft,1);mouse(kCGEventRightMouseUp,p,kCGMouseButtonRight,1);for(int i=54;i<=62;i++)key(i,NO,0);result=[@{@"ok":@YES} mutableCopy];}
 else if([action isEqual:@"inspect"]){NSRunningApplication *front=a[@"bundleId"]?[NSRunningApplication runningApplicationsWithBundleIdentifier:a[@"bundleId"]].firstObject:NSWorkspace.sharedWorkspace.frontmostApplication;if(!front)die(@"Target application is not running");NSMutableArray *apps=[NSMutableArray array],*rows=[NSMutableArray array];for(NSRunningApplication *app in NSWorkspace.sharedWorkspace.runningApplications)if(app.activationPolicy==NSApplicationActivationPolicyRegular)[apps addObject:@{@"name":app.localizedName?:@"",@"bundleId":app.bundleIdentifier?:@""}];
 if(front){AXUIElementRef root=AXUIElementCreateApplication(front.processIdentifier);AXUIElementSetMessagingTimeout(root,.25);walk(root,0,rows,[NSDate dateWithTimeIntervalSinceNow:3]);CFRelease(root);}
 result=[@{@"ok":@YES,@"application":front.localizedName?:@"",@"bundleId":front.bundleIdentifier?:@"",@"pid":@(front.processIdentifier),@"applications":apps,@"elements":rows} mutableCopy];}
 else {result=[@{@"ok":@YES,@"action":action?:@"",@"note":@"Input dispatched; inspect/screenshot to verify actual effect. Dispatch is not task completion."} mutableCopy];
 if(![action isEqual:@"launch"]){NSString *target=a[@"targetBundleId"];if(![target isKindOfClass:NSString.class])die(@"Missing targetBundleId");NSRunningApplication *app=[NSRunningApplication runningApplicationsWithBundleIdentifier:target].firstObject;if(!app||![app activateWithOptions:0])die(@"Cannot focus target application");NSDate *limit=[NSDate dateWithTimeIntervalSinceNow:2];while(NSWorkspace.sharedWorkspace.frontmostApplication.processIdentifier!=app.processIdentifier&&limit.timeIntervalSinceNow>0){[NSRunLoop.currentRunLoop runUntilDate:[NSDate dateWithTimeIntervalSinceNow:.03]];}if(NSWorkspace.sharedWorkspace.frontmostApplication.processIdentifier!=app.processIdentifier)die(@"Target focus not confirmed; input canceled");usleep(120000);if(a[@"expectedContext"]){NSDictionary *expected=a[@"expectedContext"],*current=contextRecord();if(![expected[@"pid"] isEqual:current[@"pid"]]||![expected[@"window"] isEqual:current[@"window"]])die(@"Target window changed since observation; input canceled. Observe again.");}if([action isEqual:@"type"]||[action isEqual:@"key"]){if(IsSecureEventInputEnabled())die(@"Secure input is active; automatic keyboard input is blocked");AXUIElementRef root=AXUIElementCreateApplication(app.processIdentifier);id focused=attr(root,kAXFocusedUIElementAttribute);CFRelease(root);if(focused&&([attr((__bridge AXUIElementRef)focused,kAXRoleAttribute) isEqual:@"AXSecureTextField"]||[attr((__bridge AXUIElementRef)focused,kAXSubroleAttribute) isEqual:@"AXSecureTextField"]))die(@"Password field: automatic keyboard input blocked");}}
 if([action isEqual:@"launch"]){NSString *bundle=a[@"bundleId"];NSURL *url=[bundle isKindOfClass:NSString.class]?([NSWorkspace.sharedWorkspace URLForApplicationWithBundleIdentifier:bundle]?:[NSRunningApplication runningApplicationsWithBundleIdentifier:bundle].firstObject.bundleURL):nil;if(!url)die(@"Application bundle ID not found");
 __block BOOL done=NO;__block NSError *error=nil;[NSWorkspace.sharedWorkspace openApplicationAtURL:url configuration:[NSWorkspaceOpenConfiguration configuration] completionHandler:^(NSRunningApplication *app,NSError *err){error=err;done=YES;}];NSDate *limit=[NSDate dateWithTimeIntervalSinceNow:5];while(!done&&limit.timeIntervalSinceNow>0)[NSRunLoop.currentRunLoop runUntilDate:[NSDate dateWithTimeIntervalSinceNow:.02]];if(!done)die(@"Application launch timed out");if(error)die(error.localizedDescription);}
 else if([action isEqual:@"click"]){CGPoint p=point(a,@"x",@"y");BOOL right=[a[@"button"] isEqual:@"right"];int count=a[@"clicks"]?[a[@"clicks"] intValue]:1;if(count<1||count>2)die(@"clicks must be 1 or 2");mouse(kCGEventMouseMoved,p,kCGMouseButtonLeft,1);for(int i=1;i<=count;i++){mouse(right?kCGEventRightMouseDown:kCGEventLeftMouseDown,p,right?kCGMouseButtonRight:kCGMouseButtonLeft,i);mouse(right?kCGEventRightMouseUp:kCGEventLeftMouseUp,p,right?kCGMouseButtonRight:kCGMouseButtonLeft,i);usleep(70000);}}
 else if([action isEqual:@"move"])mouse(kCGEventMouseMoved,point(a,@"x",@"y"),kCGMouseButtonLeft,1);
 else if([action isEqual:@"drag"]){CGPoint p=point(a,@"x",@"y"),end=point(a,@"toX",@"toY");mouse(kCGEventLeftMouseDown,p,kCGMouseButtonLeft,1);for(int i=1;i<=30;i++){mouse(kCGEventLeftMouseDragged,CGPointMake(p.x+(end.x-p.x)*i/30,p.y+(end.y-p.y)*i/30),kCGMouseButtonLeft,1);usleep(10000);}mouse(kCGEventLeftMouseUp,end,kCGMouseButtonLeft,1);}
 else if([action isEqual:@"scroll"]){mouse(kCGEventMouseMoved,point(a,@"x",@"y"),kCGMouseButtonLeft,1);int dy=[a[@"deltaY"] intValue],dx=[a[@"deltaX"] intValue];if(dy < -2000||dy>2000||dx < -2000||dx>2000)die(@"Scroll exceeds limit");CGEventRef e=CGEventCreateScrollWheelEvent(NULL,kCGScrollEventUnitPixel,2,dy,dx);CGEventPost(kCGHIDEventTap,e);CFRelease(e);}
 else if([action isEqual:@"key"]){NSDictionary *codes=@{@"a":@0,@"s":@1,@"d":@2,@"f":@3,@"h":@4,@"g":@5,@"z":@6,@"x":@7,@"c":@8,@"v":@9,@"b":@11,@"q":@12,@"w":@13,@"e":@14,@"r":@15,@"y":@16,@"t":@17,@"1":@18,@"2":@19,@"3":@20,@"4":@21,@"6":@22,@"5":@23,@"9":@25,@"7":@26,@"8":@28,@"0":@29,@"o":@31,@"u":@32,@"i":@34,@"p":@35,@"=":@24,@"-":@27,@"]":@30,@"[":@33,@"'":@39,@";":@41,@"\\":@42,@",":@43,@"/":@44,@".":@47,@"`":@50,@"enter":@36,@"l":@37,@"j":@38,@"k":@40,@"tab":@48,@"space":@49,@"backspace":@51,@"escape":@53,@"delete":@117,@"home":@115,@"end":@119,@"pageup":@116,@"pagedown":@121,@"left":@123,@"right":@124,@"down":@125,@"up":@126,@"f1":@122,@"f2":@120,@"f3":@99,@"f4":@118,@"f5":@96,@"f6":@97,@"f7":@98,@"f8":@100,@"f9":@101,@"f10":@109,@"f11":@103,@"f12":@111};NSNumber *code=codes[[a[@"key"] lowercaseString]];if(!code)die(@"Unsupported key");CGEventFlags flags=0;for(NSString *modifier in a[@"modifiers"]?:@[]){if([modifier isEqual:@"command"])flags|=kCGEventFlagMaskCommand;else if([modifier isEqual:@"shift"])flags|=kCGEventFlagMaskShift;else if([modifier isEqual:@"option"])flags|=kCGEventFlagMaskAlternate;else if([modifier isEqual:@"control"])flags|=kCGEventFlagMaskControl;else die(@"Invalid modifier");}NSDictionary *modifierCodes=@{@"command":@55,@"shift":@56,@"option":@58,@"control":@59};for(NSString *modifier in a[@"modifiers"]?:@[])key([modifierCodes[modifier] unsignedShortValue],YES,flags);key(code.unsignedShortValue,YES,flags);usleep(30000);key(code.unsignedShortValue,NO,flags);for(NSString *modifier in [a[@"modifiers"] reverseObjectEnumerator])key([modifierCodes[modifier] unsignedShortValue],NO,0);}
 else if([action isEqual:@"type"]){NSString *text=a[@"text"];if(![text isKindOfClass:NSString.class]||text.length>4000)die(@"Text limited to 4000 UTF-16 units");if([a[@"replaceAll"] boolValue]){key(55,YES,kCGEventFlagMaskCommand);key(0,YES,kCGEventFlagMaskCommand);key(0,NO,kCGEventFlagMaskCommand);key(55,NO,0);usleep(80000);}[text enumerateSubstringsInRange:NSMakeRange(0,text.length) options:NSStringEnumerationByComposedCharacterSequences usingBlock:^(NSString *s,NSRange r,NSRange enclosing,BOOL *stop){UniChar units[s.length];[s getCharacters:units range:NSMakeRange(0,s.length)];CGEventRef e=CGEventCreateKeyboardEvent(NULL,0,true);CGEventSetFlags(e,0);CGEventKeyboardSetUnicodeString(e,s.length,units);CGEventPost(kCGHIDEventTap,e);CGEventSetType(e,kCGEventKeyUp);CGEventPost(kCGHIDEventTap,e);CFRelease(e);}];}
 else die(@"Unknown action");usleep(200000);
 }}}
 @catch(NSException *e){result=[@{@"ok":@NO,@"error":e.reason?:@"Native failure"} mutableCopy];status=1;}
 NSData *json=[NSJSONSerialization dataWithJSONObject:result options:NSJSONWritingSortedKeys error:nil];fwrite(json.bytes,1,json.length,stdout);fputs("\n",stdout);return status;
}}
