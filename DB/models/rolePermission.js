import mongoose from 'mongoose';

const rolePermissionSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  roleId: { type: String, required: true },
  isAdd: { type: Boolean, default: false },
  isUpdate: { type: Boolean, default: false },
  isDelete: { type: Boolean, default: false },
});

export default mongoose.model('RolePermission', rolePermissionSchema);
