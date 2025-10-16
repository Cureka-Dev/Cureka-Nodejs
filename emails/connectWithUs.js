
function connectWithUsEmail(data) {
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

  export { connectWithUsEmail };

