import mongoose from 'mongoose';
const schema=new mongoose.Schema({key:{type:String,required:true,unique:true},value:{type:mongoose.Schema.Types.Mixed,required:true},updatedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}},{timestamps:{createdAt:'createdDate',updatedAt:'updatedDate'},versionKey:false});
export default mongoose.model('SystemSetting',schema);
