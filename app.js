import Express from 'express';
import connectDB from './DB/connection.js';
import cors from 'cors';
import notFoundHandler from './middlewares/not-found.js';
import errorHandler from './middlewares/errorHandler.js';
import dotenv from 'dotenv';
import notification from "./middlewares/notification.js";
// import { upload } from "./middlewares/multer.js";
// Import Routes
import userRouter from './routes/users.js';
import uploadRouter from './routes/upload.js';
import customerRouter from './routes/customers.js';
import adminUsersRoutes from './routes/adminUsers.js';
import brandsRoutes from './routes/brands.js';
import categoriesRoutes from './routes/categoryRoutes.js';
import concernsRoutes from './routes/concernRoutes.js';
import productsRoutes from './routes/products.js';
import reviewRoutes from './routes/reviewRoutes.js';
import popupRoutes from './routes/popupRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import addsRoutes from './routes/adds.js';
import addressRoutes from './routes/address.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orderRoutes.js';
import homeBannersRoutes from './routes/homeBannerRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import productImportRoutes from './routes/productImportRoutes.js';
import dashboardRoutes from './routes/dashboard.js';
import articalTypeManagementRoutes from './routes/articalTypeManagementRoutes.js';
import preferenceRoutes from './routes/preference.js';
import blogCommentRoutes from './routes/blogComment.js';
import policyRoutes from './routes/policyRoutes.js';
import faqRoutes from './routes/faq.js';
import couponRoutes from './routes/couponRoutes.js';
import curatedProductsRoutes from './routes/curatedProductRoutes.js';
import sellWithUsRoutes from './routes/sellWithUs.js';
import fasterRoutes from './routes/fasterRoutes.js';
import roleRoutes from './routes/role.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import path from 'path';
import { fileURLToPath } from "url";

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Import Data model for Chat
import logger from './middlewares/logger.js';
// Import Data model for Chat
dotenv.config();
//import { createElasticIndex } from './middlewares/elasticsearch.js';
const app = Express();

// To Clear cache
// app.use((req, res, next) => {
//   res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
//   res.setHeader("Pragma", "no-cache");
//   res.setHeader("Expires", "0");
//   res.setHeader("Surrogate-Control", "no-store");
//   next();
// });
// // Call the createElasticIndex before server starts
// (async () => {
//   //await deleteElasticIndex();        // Optional — only in dev
//   await createElasticIndex();        // Always create after delete
// })();
// Middlewares
const allowedOrigins = ["http://localhost:3000", "http://139.59.40.225:3000", "http://3.110.101.159:3000", "http://192.168.0.120:3000", "http://172.31.13.192:3000", "https://tst.openteqdev.com", "http://103.177.225.25:3007", "https://103.177.225.25:3007","http://159.65.146.149:3000","https://curekans.openteqdev.com","https://beta.cureka.com/"];
const corsOptions = {
  origin: function (origin, callback) {
    //console.log(origin);
    logger.info(origin);
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(Express.json());
app.use('/uploads', Express.static('uploads'));
// Serve files inside public folder at /files
app.use("/files", Express.static(path.join(__dirname, "public")));
connectDB();

// Routes
const baseRoute = `/api/v1`;
app.use(`${baseRoute}/users`, userRouter);
app.use(`${baseRoute}/uploads`, uploadRouter);
app.use(`${baseRoute}/customers`, customerRouter);
app.use(`${baseRoute}/adminusers`, adminUsersRoutes);
app.use(`${baseRoute}/brands`, brandsRoutes);
app.use(`${baseRoute}/categories`, categoriesRoutes);
app.use(`${baseRoute}/concerns`, concernsRoutes);
app.use(`${baseRoute}/products`, productsRoutes);
app.use(`${baseRoute}/reviews`, reviewRoutes);
app.use(`${baseRoute}/popup`, popupRoutes);
app.use(`${baseRoute}/blogs`, blogRoutes);
app.use(`${baseRoute}/adds`, addsRoutes);
app.use(`${baseRoute}/address`, addressRoutes);
app.use(`${baseRoute}/cart`, cartRoutes);
app.use(`${baseRoute}/order`, orderRoutes);
app.use(`${baseRoute}/homeBanners`, homeBannersRoutes);
app.use(`${baseRoute}/wishlist`, wishlistRoutes);
app.use(`${baseRoute}/productImport`, productImportRoutes);
app.use(`${baseRoute}/dashboard`, dashboardRoutes);
app.use(`${baseRoute}/articalTypeManagementRoutes`, articalTypeManagementRoutes);
app.use(`${baseRoute}/preference`, preferenceRoutes);
app.use(`${baseRoute}/blogComment`, blogCommentRoutes);
app.use(`${baseRoute}/policy`, policyRoutes);
app.use(`${baseRoute}/faqs`, faqRoutes);
app.use(`${baseRoute}/coupons`, couponRoutes);
app.use(`${baseRoute}/curatedProducts`, curatedProductsRoutes);
app.use(`${baseRoute}/sellWithUs`, sellWithUsRoutes);
app.use(`${baseRoute}/faster`, fasterRoutes);
app.use(`${baseRoute}/roles`, roleRoutes);
app.use(`${baseRoute}/subscriptions`, subscriptionRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
const port = parseInt(process.env.SERVER_PORT) || 3000;

// Start the server using app.listen
app.listen(port, () => console.log(`Server running on port ${port}!`));
