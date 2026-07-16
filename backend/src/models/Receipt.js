import mongoose from 'mongoose';
const schema=new mongoose.Schema({number:{type:String,required:true,unique:true,index:true},patient:{type:mongoose.Schema.Types.ObjectId,ref:'Patient',required:true,index:true},payment:{type:mongoose.Schema.Types.ObjectId,ref:'Payment',required:true},printedCount:{type:Number,default:0,min:0},lastPrintedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},lastPrintedAt:Date},{timestamps:{createdAt:'createdDate',updatedAt:'updatedDate'},versionKey:false});
export default mongoose.model('Receipt',schema);
