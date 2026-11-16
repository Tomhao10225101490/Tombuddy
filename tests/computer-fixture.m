#import <AppKit/AppKit.h>
@interface OCRControl : NSView
@property(copy) void (^clicked)(void);
@end
@implementation OCRControl
-(BOOL)isAccessibilityElement{return NO;}
-(void)drawRect:(NSRect)dirty{[[NSColor colorWithWhite:.93 alpha:1]setFill];NSRectFill(self.bounds);[@"OCR ONLY ACTION" drawAtPoint:NSMakePoint(15,24) withAttributes:@{NSFontAttributeName:[NSFont boldSystemFontOfSize:24],NSForegroundColorAttributeName:NSColor.blackColor}];}
-(void)mouseDown:(NSEvent*)event{if(self.clicked)self.clicked();}
@end
@interface Fixture : NSObject<NSApplicationDelegate,NSTextFieldDelegate>
@property NSWindow *window; @property NSTextField *field; @property NSString *directory; @property NSInteger clicks; @property NSInteger ocrClicks;
@end
@implementation Fixture
-(void)save { NSDictionary *data=@{@"text":self.field.stringValue,@"clicks":@(self.clicks)};[[NSJSONSerialization dataWithJSONObject:data options:0 error:nil] writeToFile:[self.directory stringByAppendingPathComponent:@"actual-input.json"] atomically:YES]; }
-(void)controlTextDidChange:(NSNotification*)notification{[self save];}
-(void)clicked:(id)sender{self.clicks++;[self save];}
-(void)applicationDidFinishLaunching:(NSNotification*)note {
 self.directory=NSProcessInfo.processInfo.arguments.lastObject;
 NSMenu *menu=[NSMenu new];NSMenuItem *edit=[NSMenuItem new];[menu addItem:edit];NSMenu *submenu=[[NSMenu alloc]initWithTitle:@"Edit"];[submenu addItemWithTitle:@"Select All" action:@selector(selectAll:) keyEquivalent:@"a"];[submenu addItemWithTitle:@"Copy" action:@selector(copy:) keyEquivalent:@"c"];[submenu addItemWithTitle:@"Paste" action:@selector(paste:) keyEquivalent:@"v"];edit.submenu=submenu;NSApp.mainMenu=menu;
 self.window=[[NSWindow alloc]initWithContentRect:NSMakeRect(100,140,1100,650) styleMask:NSWindowStyleMaskTitled|NSWindowStyleMaskClosable|NSWindowStyleMaskResizable backing:NSBackingStoreBuffered defer:NO];self.window.title=@"Tombuddy isolated computer-use fixture — NOT real model output";
 NSTextField *label=[NSTextField labelWithString:@"REAL native input fixture · isolated /tmp data · no network"];label.frame=NSMakeRect(45,560,950,40);[self.window.contentView addSubview:label];
 self.field=[[NSTextField alloc]initWithFrame:NSMakeRect(45,460,850,42)];self.field.placeholderString=@"Computer input target";self.field.accessibilityLabel=@"Computer input target";self.field.delegate=self;[self.window.contentView addSubview:self.field];
 NSButton *button=[NSButton buttonWithTitle:@"Record real click" target:self action:@selector(clicked:)];button.frame=NSMakeRect(45,365,230,45);[self.window.contentView addSubview:button];
 OCRControl *ocr=[[OCRControl alloc]initWithFrame:NSMakeRect(400,330,310,80)];ocr.clicked=^{self.ocrClicks++;[[NSJSONSerialization dataWithJSONObject:@{@"ocrClicks":@(self.ocrClicks)} options:0 error:nil] writeToFile:[self.directory stringByAppendingPathComponent:@"actual-ocr-input.json"] atomically:YES];};[self.window.contentView addSubview:ocr];[[NSJSONSerialization dataWithJSONObject:@{@"ocrClicks":@0} options:0 error:nil] writeToFile:[self.directory stringByAppendingPathComponent:@"actual-ocr-input.json"] atomically:YES];
 [self.window makeKeyAndOrderFront:nil];[NSApp activateIgnoringOtherApps:YES];[self save];
}
@end
int main(int argc,const char**argv){@autoreleasepool{NSApplication *app=NSApplication.sharedApplication;[app setActivationPolicy:NSApplicationActivationPolicyRegular];Fixture *delegate=[Fixture new];app.delegate=delegate;[app run];}}
