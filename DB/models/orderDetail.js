import mongoose from "mongoose";

const orderDetailSchema = new mongoose.Schema({
    order_id:{ type: Number, required: true },
  product_id: { type: Number, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },   // final price per unit
  total: { type: Number },   // quantity * price
});

//export default orderDetailSchema;  // 👉 export only the schema (not a model)

export default mongoose.model("orderDetail", orderDetailSchema);
