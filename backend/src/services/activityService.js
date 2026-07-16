import ActivityLog from '../models/ActivityLog.js';
export const recordActivity=(user,action,entityType,entity,details='',context={})=>ActivityLog.create({user,action,entityType,entity,details,role:context.role,ipAddress:context.ipAddress});
