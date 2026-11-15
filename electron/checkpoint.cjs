// Complete every signed tool-call envelope for safe stop/crash replay, without claiming success.
function checkpointWire(wire,pending=[],activeId){return [...wire,...pending.map(call=>({role:'tool',callId:call.id,name:call.name,content:call.id===activeId?'执行已停止或结果未确认。恢复时先核对实际项目状态；不要假定成功，也不要盲目重复执行。':'此操作尚未执行，任务已暂停或取消。'}))];}
module.exports={checkpointWire};
