import mongoose from 'mongoose';
const schema=new mongoose.Schema({
  key:{type:String,unique:true,default:'default'},
  staffDiscount:{type:Number,min:0,max:100,default:20},
  collaboratorDiscount:{type:Number,min:0,max:100,default:20},
  counselingStatus:{type:String,enum:['Free','Paid'],default:'Free'},
  counselingPrice:{type:Number,min:0,default:0},
  cbcGroupPrice:{type:Number,min:0,default:150},
  urineChemicalPrice:{type:Number,min:0,default:300},
  urineMicroscopyPrice:{type:Number,min:0,default:300},
  stockManagementMode:{type:String,enum:['Smart','Manual'],default:'Smart'},
  publicReportSharing:{
    enabled:{type:Boolean,default:true},
    autoGenerateOnApproval:{type:Boolean,default:true},
    defaultExpiryDays:{type:Number,min:0,max:365,default:30},
    allowPdfDownload:{type:Boolean,default:true}
  }
},{timestamps:true,versionKey:false});
export default mongoose.model('LaboratorySettings',schema);

