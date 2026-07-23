import mongoose from 'mongoose';
const schema=new mongoose.Schema({name:{type:String,required:true,trim:true,unique:true},description:{type:String,default:''},displayOrder:{type:Number,default:0},status:{type:String,enum:['Active','Inactive'],default:'Active'},hidden:{type:Boolean,default:false}},{timestamps:true,versionKey:false});
export default mongoose.model('LaboratoryTestCategory',schema);
