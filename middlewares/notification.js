import admin from 'firebase-admin';
import serviceAccount from '../cureka_user_firabasekey.json' assert { type: 'json' };

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

// Function to determine the correct folder for file storage based on file type
const notification = async (notificationData) => {
  //console.log("notificationData",notificationData);
    const { deviceToken, title, body, data } = notificationData;
 
    // if (!deviceToken || !title || !body) {
    //   return res.status(400).send('Device token, title, and body are required');
    // }
 
    // Create the notification payload
    const message = {
      token: deviceToken,
      notification: {
        title: title,
        body: body,
      },
      data: data || {}, // Optional custom data
    };
 
    try {
      // Send the push notification
      const response = await admin.messaging().send(message);
      console.log('Successfully sent notification:', response);
      //return res.status(200).send('Notification sent successfully');
    } catch (error) {
      console.error('Error sending notification:', error);
      //return res.status(500).send('Error sending notification');
    }
}

export default notification; // Export configured multer upload for use in other modules