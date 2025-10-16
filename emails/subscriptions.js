
function subscriptionsEmail(data) {
    return `<div style="width: 80%; margin: 20px auto; background: rgba(239, 239, 239, 1); padding: 20px 20px 50px">

    <div style="text-align: center; margin: 10px auto">

     <img style="width: 20%; margin: auto" src="https://www.cureka.com/wp-content/uploads/2020/11/logo-dark-3.png">           

    </div>

     <div style="padding: 20px; background: rgba(255, 255, 255, 1)">

         <p style="text-align: center; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bolder; font-size: 15px; color: rgba(34, 34, 34, 1)">Congratulations!</p>

         <hr style="border-width: 1px; border-color: rgba(189, 150, 94, 1)">

         <p style="font-size: 14px; color: rgba(68, 68, 68, 1)"> Dear  ${data.name},</p>

         <p style="font-size: 14px; color: rgba(68, 68, 68, 1)">Congratulations! Your subscription is now active and ready to elevate your experience with us! Get ready to unlock exclusive content, premium features, and more. Thank you for joining our community!</p>

     </div>

    <div style="margin: 10px auto; padding: 20px; background: rgba(239, 239, 239, 1)">

         <div style="float: left">

             <p style="font-size: 14px">Best Regards,</p>

             <p style="font-size: 14px">Cureka </p>    

         </div>     

     </div>

 </div>`;
}
function connectWithUsEmail(data) {
    return `<div style="width: 80%; margin: 20px auto; background: rgba(239, 239, 239, 1); padding: 20px 20px 50px">

    <div style="text-align: center; margin: 10px auto">

     <img style="width: 20%; margin: auto" src="https://www.cureka.com/wp-content/uploads/2020/11/logo-dark-3.png">           

    </div>

     <div style="padding: 20px; background: rgba(255, 255, 255, 1)">

         <p style="text-align: center; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bolder; font-size: 15px; color: rgba(34, 34, 34, 1)">Congratulations!</p>

         <hr style="border-width: 1px; border-color: rgba(189, 150, 94, 1)">

         <p style="font-size: 14px; color: rgba(68, 68, 68, 1)"> Dear  ${data.name},</p>

         <p style="font-size: 14px; color: rgba(68, 68, 68, 1)">We hope this email finds you well. At [Your Company Name], we strive to keep our valued customers like you in the loop with the latest updates, offers, and exciting news.</p>

         <p style="font-size: 14px; color: rgba(68, 68, 68, 1)">We're thrilled to introduce our new "Connect With Us" feature, designed exclusively for our loyal customers. By opting in, you'll gain access to a range of benefits</p>
         <p style="font-size: 14px; color: rgba(68, 68, 68, 1)">Thank you for being a valued member of our community. We look forward to staying connected and continuing to serve you better.</p>
     </div>

    <div style="margin: 10px auto; padding: 20px; background: rgba(239, 239, 239, 1)">

         <div style="float: left">

             <p style="font-size: 14px">Best Regards,</p>

             <p style="font-size: 14px">Cureka </p>    

         </div>     

     </div>

 </div>`;
}
function orderInfo(data) {
    let products = data.products;
    let table = `<h2> <b>Order Id: </b>#${data.OrderID}</h2>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                     <th>MRP</th>
                    <th>Final Price</th>
                </tr>
            </thead>
            <tbody>`;

    products.forEach(item => {
        table += `
            <tr>
                <td style="width: 50%;">${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>${item.mrp}</td>
                <td>${item.final_price}</td>
            </tr>`;
    });

    table += `
            </tbody>
        </table>
        </br>
        <table align="right" text-align= "left">
        <tr>
                    <td colspan="5">Subtotal:</td>
                    <td text-align="right">${data.Subtotal}</td>
                    </tr>
                    <tr>
                    <td colspan="5">Discount:</td>
                    <td text-align="right">${data.Discount}</td>
                    </tr>
                    <tr>
                    <td colspan="5">Applied Coupon:</td>
                    <td text-align="right">${data.appliedCoupons}</td>
                    </tr>
                    <tr>
                    <td colspan="5">Payment Method:</td>
                    <td text-align="right">${data.paymentMethod}</td>
                    </tr>
                    <tr>
                    <td colspan="5">Shippment Charges:</td>
                    <td text-align="right">${data.shippingCharge}</td>
                    </tr>
                    <tr>
                    <td colspan="5">Total:</td>
                     <td text-align="right">${data.Total}</td>
                     <tr>
                </tr>
                </table>`;

    return table;
}
function orderCancel(data) {
    let table = `<h2> Your <b>Order Id: </b>#${data.OrderID} was Cancelled</h2>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
            <thead>
                <tr>
                    <th>Order Id</th>
                    <th>Status</th>
                    <th>Cancelled Reason</th>
                </tr>
            </thead>
            <tbody>`;

    //products.forEach(item => {
        table += `
            <tr>
                <td>${data.OrderID}</td>
                <td>${data.status}</td>
                <td>${data.cancellationReason}</td>
            </tr>`;
   // });

    table += `
            </tbody>
        </table>`;

    return table;
}
function adminForgetPassword(data) {
    return `<div style="width: 80%; margin: 20px auto; background: rgba(239, 239, 239, 1); padding: 20px 20px 50px">

    <div style="text-align: center; margin: 10px auto">

     <img style="width: 20%; margin: auto" src="https://www.cureka.com/wp-content/uploads/2020/11/logo-dark-3.png">           

    </div>

     <div style="padding: 20px; background: rgba(255, 255, 255, 1)">
     
         <hr style="border-width: 1px; border-color: rgba(189, 150, 94, 1)">

         <p style="font-size: 14px; color: rgba(68, 68, 68, 1)"> Dear  User,</p>

         <p style="font-size: 14px; color: rgba(68, 68, 68, 1)">Click on the following link to reset your password: http://frontend.cureka.com/admin/reset-password?token=${data.token}</p>

     </div>

    <div style="margin: 10px auto; padding: 20px; background: rgba(239, 239, 239, 1)">

         <div style="float: left">

             <p style="font-size: 14px">Best Regards,</p>

             <p style="font-size: 14px">Cureka </p>    

         </div>     

     </div>

 </div>`;
}


export { connectWithUsEmail, orderInfo, subscriptionsEmail,orderCancel,adminForgetPassword };

