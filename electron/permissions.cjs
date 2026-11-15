// User-selected tool permissions; immutable for the lifetime of a run.
function taskPermissions(mode='full') {
 if(!['full','execute','plan'].includes(mode))throw new Error('无效任务模式');
 return {mode,requiresApproval:mode==='execute',readOnly:mode==='plan'};
}
function allowsTool(permissions,name){return !permissions.readOnly || ['update_plan','list_files','read_file'].includes(name);}
module.exports={taskPermissions,allowsTool};
