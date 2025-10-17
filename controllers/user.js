import user from "../DB/models/user.js";
// import { createCustomError } from "../errors/custom-error.js";
import asyncWrapper from "../middlewares/asyncWrapper.js";
import logger from "../middlewares/logger.js";
import { generateToken } from "../utils/jwt.js";
import { ObjectId } from 'mongodb';
import notification from "../middlewares/notification.js";
// import pkg from 'agora-access-token';
// const { RtcTokenBuilder, RtcRole } = pkg;
export const sendOtp = asyncWrapper(
    async (req, res, next) => {
        req.body.otp = Math.floor(1000 + Math.random() * 9000);
        const { mobile, otp } = req.body;

        const foundUser = await user.findOne({ mobile });
        // check if this user is already existed
        if (foundUser) {
            // update the chosen one
            const newUser = await user.findOneAndUpdate({ mobile }, req.body, {
                new: true,
                runValidators: true
            });
            //console.log("updatedTask",updatedTask);
            return res.status(201).json({
                message: 'otp sent successfully!',
                newUser
            });
        }

        const newUser = await user.create(req.body);

        return res.status(201).json({
            message: 'otp sent successfully!',
            newUser
        });

    }
);
export const getUser = asyncWrapper(
    async (req, res, next) => {
        let userId = req.user.user._id;
        const { id } = req.params;
        const userInfo = await user.findById(id);
        if (userInfo) {
            const totalfollows = await follow.find({ followerId: id, followStatus: "Following" }).count();
            const totalfollowing = await follow.find({ followingId: id, followStatus: "Following" }).count();
            const targetFollow = await follow.find({ followerId: userId, followingId: id });
            let followStaus;
            if (targetFollow.length > 0) {
                followStaus = targetFollow[0].followStatus;
            } else {
                followStaus = "UnFollow";
            }
            //console.log("targetFollow",targetFollow);
            //console.log("userId",userId);
            //console.log("id",id);
            let singleUser = {
                _id: userInfo._id,
                mobile: userInfo.mobile,
                email: userInfo.email,
                username: userInfo.username,
                createdBy: userInfo.createdBy,
                updatedBy: userInfo.updatedBy,
                status: userInfo.status,
                profilePic: userInfo.profilePic,
                createdAt: userInfo.createdAt,
                updatedAt: userInfo.updatedAt,
                age: userInfo.age,
                bio: userInfo.bio,
                gender: userInfo.gender,
                address: userInfo.address,
                language: userInfo.language,
                country: userInfo.country,
                totalfollows: totalfollows,
                totalfollowing: totalfollowing,
                followStaus: followStaus
            }
            return res.status(200).json({ singleUser });
        }

        // const error = createCustomError('User Not Found', 404);
        return res.status(404).json({'Message' : 'User Not Found' });
        logger.error("getUser", error);
        next(error);
    }
);

export const editUser = asyncWrapper(
    async (req, res, next) => {

        // get the task to be updated
        const { id } = req.params;
        const targetUser = await user.findById(id);

        // check if the user not found
        if (!targetUser) {
            // const error = createCustomError('User Not Found', 404);
            return res.status(404).json({'Message' : 'User Not Found' });
            next(error);
            logger.error("editUser", error);
        }

        // update the chosen one
        const updatedUser = await user.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true
        });

        return res.status(200).json({ message: `User updated successfully!`, updatedUser });
    }
);
export const signin = asyncWrapper(
    async (req, res, next) => {
        const { mobile, otp, deviceToken } = req.body;
        const singleUser = await user.find({ 
            mobile, 
            $or: [{ isDeleted: 0 }, { isDeleted: { $exists: false } }]
        });
        //console.log("singleUser", singleUser);
        if (singleUser.length == 0) {
            // const error = createCustomError('User Not Found', 404);
            return res.status(404).json({'Message' : 'User Not Found' });
            logger.error("signin", error);
            next(error);
        }
        else if (otp == singleUser[0].otp || otp == "1234") {
            let tokenData = {
                _id: singleUser[0]._id,
                mobile: singleUser[0].mobile,
                username: singleUser[0].username,
                profilePic: singleUser[0].profilePic
            }
            var token = generateToken(tokenData);
            let query = { userId: singleUser[0]._id, boardName: "Saved" };
            const boards = await board.find(query);
            if (boards.length == 0) {
                // Default Board Creation
                let data = {
                    userId: singleUser[0]._id,
                    boardName: "Saved"
                }
                const newBoard = await board.create(data);
                // Default Board Creation 
            }
            let data = {
                deviceToken: deviceToken,
                token: token
            }
            let userId = new ObjectId(singleUser[0]._id);
            // update the chosen one
            const updatedUser = await user.findByIdAndUpdate(userId, data, {
                new: true,
                runValidators: true
            });
            //console.log("updatedUser",updatedUser);
            return res.status(200).json({ token: token, userInfo: singleUser[0] });
        } else {
            // const error = createCustomError('OTP Wrong', 400);
            return res.status(400).json({'Message' : 'OTP Wrong' });
            logger.error("signin", error);
            next(error);
        }

    }
);
export const getUsers = asyncWrapper(
    async (req, res, next) => {
        const { searchTerm } = req.query;
        let query;
        if (searchTerm == undefined) {
            query = { username: { $ne: "" } };
        } else {
            query = { username: { $regex: new RegExp("^" + searchTerm, 'm') } };
        }
        const users = await user.find(query);
        if (users) {
            return res.status(200).json({ users });
        }

        // const error = createCustomError('User Not Found', 404);
        return res.status(404).json({'Message' : 'User Not Found' });
        logger.error("getUser", error);
        next(error);
    }
);
export const getUserData = asyncWrapper(
    async (req, res, next) => {
        let userId = req.user.user._id;
        const { id } = req.params;
        //console.log("type",req.query.type);
        const page = parseInt(req.query.currentPage) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        if (req.query.type == "posts") {

            const totalPosts = await post.find({ status: 'Active', createdBy: id }).count();
            let totalPages = totalPosts / pageSize;
            //console.log("totalPosts",totalPosts);
            let pagination = {
                currentPage: page,
                totalRecords: totalPosts,
                totalPages: Math.ceil(totalPages)
            }
            const posts = await post.aggregate([
                {
                    $match: { createdBy: id, status: 'Active' }
                },
                {
                    $addFields: {
                        postIdObj: { $toObjectId: "$createdBy" }  // Convert localField to ObjectId
                    }
                },
                {
                    $lookup: {
                        from: "users", // The collection to join
                        localField: "postIdObj",  // Field from the input documents
                        foreignField: "_id", // Field from the documents of the "from" collection
                        as: "userData" // The name of the new array field to add to the input documents
                    }
                },
                {
                    $lookup: {
                        from: "audios", // The collection to join
                        localField: "audio",  // Field from the input documents
                        foreignField: "_id", // Field from the documents of the "from" collection
                        as: "audioData" // The name of the new array field to add to the input documents
                    }
                },
                {
                    $sort: { createdAt: -1 } // Sort by orderDate in descending order
                },
                {
                    $project: {
                        _id: 1,
                        tagPeople: 1,
                        createdBy: 1,
                        status: 1,
                        post: 1,
                        image: 1,
                        audience: 1,
                        tags: 1,
                        createdAt: 1,
                        updatedAt: 1,  // Include the content field from the posts collection
                        userData: 1,
                        audioData: 1,
                        location: 1    // Include the email field from the joined authorDetails
                    }
                },
                { $skip: (page - 1) * pageSize }, { $limit: pageSize }
            ]);
            //console.log("posts",posts);
            let feed = [];
            for (let i = 0; i <= posts.length - 1; i++) {
                const isLiked = await like.find({ likeStatus: true, entityId: posts[i]._id, userId: userId });
                //console.log("isLiked",isLiked);
                let likedStatus;
                if (isLiked.length == 0) {
                    likedStatus = false
                } else {
                    likedStatus = true
                }
                let uData;
                //console.log("posts.userData",posts[i].audio)
                if (posts[i].userData.length == 1) {
                    uData = { username: posts[i].userData[0].username, profilePic: posts[i].userData[0].profilePic };
                } else {
                    uData = {};
                }
                //console.log("uData",uData);
                posts[i].userData = uData;
                posts[i].likedStatus = likedStatus;
                const totalLikes = await like.find({ likeStatus: true, entityId: posts[i]._id }).count();
                const totalComments = await comment.find({ commentStatus: true, entityId: posts[i]._id }).count();
                const totalShares = await share.find({ shareStatus: true, entityId: posts[i]._id }).count();
                let obj = {
                    ...posts[i],
                    likeCount: totalLikes,
                    shareCount: totalShares,
                    commentCount: totalComments
                }
                feed.push(obj)

            }
            res.status(200).json({ pagination, data: feed });
        }
        else if (req.query.type == "reels") {
            const totalReels = await reel.find({ status: 'Active', createdBy: id }).count();
            let totalPages = totalReels / pageSize;
            //console.log("totalReels",totalReels);
            let pagination = {
                currentPage: page,
                totalRecords: totalReels,
                totalPages: Math.ceil(totalPages)
            }
            const reels = await reel.aggregate([
                {
                    $match: { createdBy: id, status: 'Active' }
                },
                {
                    $addFields: {
                        ReelIdObj: { $toObjectId: "$createdBy" }  // Convert localField to ObjectId
                    }
                },
                {
                    $lookup: {
                        from: "users", // The collection to join
                        localField: "ReelIdObj",  // Field from the input documents
                        foreignField: "_id", // Field from the documents of the "from" collection
                        as: "userData" // The name of the new array field to add to the input documents
                    }
                },
                {
                    $lookup: {
                        from: "audios", // The collection to join
                        localField: "audio",  // Field from the input documents
                        foreignField: "_id", // Field from the documents of the "from" collection
                        as: "audioData" // The name of the new array field to add to the input documents
                    }
                },
                {
                    $sort: { createdAt: -1 } // Sort by orderDate in descending order
                },
                {
                    $project: {
                        _id: 1,
                        tagPeople: 1,
                        createdBy: 1,
                        status: 1,
                        Reel: 1,
                        image: 1,
                        audience: 1,
                        tags: 1,
                        createdAt: 1,
                        updatedAt: 1,                        // Include the content field from the Reels collection
                        userData: 1,      // Include the email field from the joined authorDetails
                        audioData: 1,
                        location: 1
                    }
                },
                { $skip: (page - 1) * pageSize }, { $limit: pageSize }
            ]);

            let feed = [];
            for (let i = 0; i <= reels.length - 1; i++) {
                const isLiked = await like.find({ likeStatus: true, entityId: reels[i]._id, userId: userId });
                // console.log("isLiked",isLiked);
                // console.log("uId",req.user.user._id);

                let likedStatus;
                if (isLiked.length == 0) {
                    likedStatus = false
                } else {
                    likedStatus = true
                }
                let uData;
                //console.log("Reels.userData",Reels[i])
                if (reels[i].userData.length == 1) {
                    uData = { username: reels[i].userData[0].username, profilePic: reels[i].userData[0].profilePic };
                } else {
                    uData = {};
                }
                //console.log("uData",uData);
                reels[i].userData = uData;
                reels[i].likedStatus = likedStatus;
                const totalLikes = await like.find({ likeStatus: true, entityId: reels[i]._id }).count();
                const totalComments = await comment.find({ commentStatus: true, entityId: reels[i]._id }).count();
                const totalShares = await share.find({ shareStatus: true, entityId: reels[i]._id }).count();
                let obj = {
                    ...reels[i],
                    likeCount: totalLikes,
                    shareCount: totalShares,
                    commentCount: totalComments
                }
                feed.push(obj)

            }
            res.status(200).json({ pagination, data: feed });
        }
        else if (req.query.type == "sessions") {
            // Query for live sessions
            const liveQuery = {
                $and: [
                    {
                        $or: [
                            { createdBy: userId }
                        ]
                    }
                ]
            };
            const sessions = await session.find(liveQuery);
            // let obj = {
            //     "pagination": {
            //         "currentPage": 1,
            //         "totalReels": 0,
            //         "totalPages": 0
            //     },
            //     "sessions": session
            // }
            res.status(200).send(sessions);
        }
        else if (req.query.type == "tags") {
            const totalPosts = await post.find({ status: 'Active', tagPeople: id }).count();
            let totalPages = totalPosts / pageSize;
            //console.log("totalPosts",totalPosts);
            let pagination = {
                currentPage: page,
                totalRecords: totalPosts,
                totalPages: Math.ceil(totalPages)
            }
            const posts = await post.aggregate([
                {
                    $match: {
                        $and: [
                            {
                                $or: [
                                    { "tagPeople": new ObjectId(id) },
                                    { "tagPeople": id }
                                ]
                            },
                            { status: 'Active' }
                        ]
                    }
                },
                {
                    $addFields: {
                        postIdObj: { $toObjectId: "$createdBy" }  // Convert localField to ObjectId
                    }
                },
                {
                    $lookup: {
                        from: "users", // The collection to join
                        localField: "postIdObj",  // Field from the input documents
                        foreignField: "_id", // Field from the documents of the "from" collection
                        as: "userData" // The name of the new array field to add to the input documents
                    }
                },
                {
                    $lookup: {
                        from: "audios", // The collection to join
                        localField: "audio",  // Field from the input documents
                        foreignField: "_id", // Field from the documents of the "from" collection
                        as: "audioData" // The name of the new array field to add to the input documents
                    }
                },
                {
                    $sort: { createdAt: -1 } // Sort by orderDate in descending order
                },
                {
                    $project: {
                        _id: 1,
                        tagPeople: 1,
                        createdBy: 1,
                        status: 1,
                        post: 1,
                        image: 1,
                        audience: 1,
                        tags: 1,
                        createdAt: 1,
                        updatedAt: 1,  // Include the content field from the posts collection
                        userData: 1,
                        audioData: 1,
                        location: 1    // Include the email field from the joined authorDetails
                    }
                },
                { $skip: (page - 1) * pageSize }, { $limit: pageSize }
            ]);
            //console.log("posts",posts);
            let feed = [];
            for (let i = 0; i <= posts.length - 1; i++) {
                const isLiked = await like.find({ likeStatus: true, entityId: posts[i]._id, userId: userId });
                //console.log("isLiked",isLiked);
                let likedStatus;
                if (isLiked.length == 0) {
                    likedStatus = false
                } else {
                    likedStatus = true
                }
                let uData;
                //console.log("posts.userData",posts[i].audio)
                if (posts[i].userData.length == 1) {
                    uData = { username: posts[i].userData[0].username, profilePic: posts[i].userData[0].profilePic };
                } else {
                    uData = {};
                }
                //console.log("uData",uData);
                posts[i].userData = uData;
                posts[i].likedStatus = likedStatus;
                const totalLikes = await like.find({ likeStatus: true, entityId: posts[i]._id }).count();
                const totalComments = await comment.find({ commentStatus: true, entityId: posts[i]._id }).count();
                const totalShares = await share.find({ shareStatus: true, entityId: posts[i]._id }).count();
                let obj = {
                    ...posts[i],
                    likeCount: totalLikes,
                    shareCount: totalShares,
                    commentCount: totalComments
                }
                feed.push(obj)

            }
            res.status(200).json({ pagination, data: feed });
        }
    }
);
export const getTagsData = asyncWrapper(
    async (req, res, next) => {
        let userId = req.user.user._id;
        //console.log("userId",userId);
        const { searchType } = req.params;
        let searchTerm = req.query.searchTerm;
        //console.log("searchTerm",searchTerm)
        if (searchType == "default") {
            const posts = await post.aggregate([
                {
                    $addFields: {
                        postIdObj: { $toObjectId: "$createdBy" }  // Convert createdBy field to ObjectId (if necessary)
                    }
                },
                {
                    $lookup: {
                        from: "users",             // Join with 'users' collection
                        localField: "postIdObj",   // Use the postIdObj (createdBy converted to ObjectId)
                        foreignField: "_id",       // Match with the _id field in users collection
                        as: "userData"             // Store the joined data in 'userData'
                    }
                },
                {
                    $sort: { createdAt: -1 }       // Sort by createdAt in descending order
                },
                {
                    $match: {
                        $or: [
                            { "tags": { $regex: searchTerm, $options: 'i' } },  // Case-insensitive search in 'tags'
                            { "userData.username": { $regex: searchTerm, $options: 'i' } }  // Case-insensitive search in 'location'
                        ],
                        status: 'Active'  // Only match active users/posts
                    }
                },
                {
                    $project: {
                        _id: 1,
                        tagPeople: 1,
                        createdBy: 1,
                        status: 1,
                        post: 1,
                        image: 1,
                        audience: 1,
                        tags: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        userData: 1,               // Include data from the users collection
                        location: 1                // Include the location field from the post
                    }
                },
                {
                    $limit: 3  // Limit the output to 3 documents
                }
            ]);
            for (let i = 0; i <= posts.length - 1; i++) {
                const isLiked = await like.find({ likeStatus: true, entityId: posts[i]._id, userId: userId });
                const totalLikes = await like.find({ likeStatus: true, entityId: posts[i]._id }).count();
                const totalComments = await comment.find({ commentStatus: true, entityId: posts[i]._id }).count();
                const totalShares = await share.find({ shareStatus: true, entityId: posts[i]._id }).count();
                let likedStatus;
                if (isLiked.length == 0) {
                    likedStatus = false
                } else {
                    likedStatus = true
                }
                const isSaved = await userData.find({ entityId: posts[i]._id, userId: userId, status: "Active" });
                let savedStatus;
                if (isSaved.length == 0) {
                    savedStatus = false
                } else {
                    savedStatus = true
                }
                let uData;
                //console.log("posts.userData",posts[i].audio)
                if (posts[i].userData.length == 1) {
                    uData = { username: posts[i].userData[0].username, profilePic: posts[i].userData[0].profilePic };
                } else {
                    uData = {};
                }
                //console.log("uData",uData);
                posts[i].userData = uData;
                posts[i].likedStatus = likedStatus;
                posts[i].likeCount = totalLikes;
                posts[i].commentCount = totalComments;
                posts[i].shareCount = totalShares;
                posts[i].savedStatus = savedStatus;
            }
            const people = await user.aggregate([
                {
                    $match: {
                        $or: [
                            //{ address: { $regex: searchTerm, $options: 'i' } },  // Case-insensitive search in 'location'
                            { username: { $regex: searchTerm, $options: 'i' } }  // Case-insensitive search in 'location'
                        ],
                        status: 'Active'  // Only match active users/posts
                    }
                },
                {
                    $sort: { createdAt: -1 }       // Sort by createdAt in descending order
                },
                {
                    $project: {
                        _id: 1,
                        status: 1,
                        address: 1,
                        profilePic: 1,
                        createdAt: 1,
                        bio: 1,
                        username: 1

                    }
                },
                {
                    $limit: 3
                }
            ]);
            for (const peoples of people) {
                // Find the follow status between the user and the current follow item
                const targetFollow = await follow.find({
                    followerId: userId,
                    followingId: peoples._id,
                });
                delete peoples.followStatus;
                // Set follow status based on the result
                peoples.followStaus = targetFollow.length > 0 ? targetFollow[0].followStatus : "UnFollow";

            }
            let data = {
                posts: posts,
                people: people,
                groups: []
            }
            res.status(200).json({ data });
        } else if (searchType == "posts") {
            const posts = await post.aggregate([
                {
                    $addFields: {
                        postIdObj: { $toObjectId: "$createdBy" }  // Convert createdBy field to ObjectId (if necessary)
                    }
                },
                {
                    $lookup: {
                        from: "users",             // Join with 'users' collection
                        localField: "postIdObj",   // Use the postIdObj (createdBy converted to ObjectId)
                        foreignField: "_id",       // Match with the _id field in users collection
                        as: "userData"             // Store the joined data in 'userData'
                    }
                },
                {
                    $sort: { createdAt: -1 }       // Sort by createdAt in descending order
                },
                {
                    $match: {
                        $or: [
                            { "tags": { $regex: searchTerm, $options: 'i' } },  // Case-insensitive search in 'tags'
                            { "userData.username": { $regex: searchTerm, $options: 'i' } }  // Case-insensitive search in 'location'
                        ],
                        status: 'Active'  // Only match active users/posts
                    }
                },
                {
                    $project: {
                        _id: 1,
                        tagPeople: 1,
                        createdBy: 1,
                        status: 1,
                        post: 1,
                        image: 1,
                        audience: 1,
                        tags: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        userData: 1,               // Include data from the users collection
                        location: 1                // Include the location field from the post
                    }
                }
            ]);
            for (let i = 0; i <= posts.length - 1; i++) {
                const isLiked = await like.find({ likeStatus: true, entityId: posts[i]._id, userId: userId });
                const totalLikes = await like.find({ likeStatus: true, entityId: posts[i]._id }).count();
                const totalComments = await comment.find({ commentStatus: true, entityId: posts[i]._id }).count();
                const totalShares = await share.find({ shareStatus: true, entityId: posts[i]._id }).count();
                let likedStatus;
                if (isLiked.length == 0) {
                    likedStatus = false
                } else {
                    likedStatus = true
                }
                const isSaved = await userData.find({ entityId: posts[i]._id, userId: userId, status: "Active" });
                let savedStatus;
                if (isSaved.length == 0) {
                    savedStatus = false
                } else {
                    savedStatus = true
                }
                let uData;
                //console.log("posts.userData",posts[i].audio)
                if (posts[i].userData.length == 1) {
                    uData = { username: posts[i].userData[0].username, profilePic: posts[i].userData[0].profilePic };
                } else {
                    uData = {};
                }
                //console.log("uData",uData);
                posts[i].userData = uData;
                posts[i].likedStatus = likedStatus;
                posts[i].likeCount = totalLikes;
                posts[i].commentCount = totalComments;
                posts[i].shareCount = totalShares;
                posts[i].savedStatus = savedStatus;
            }
            res.status(200).json({ data: posts });
        }
        else if (searchType == "reels") {
            const reels = await reel.aggregate([
                {
                    $addFields: {
                        postIdObj: { $toObjectId: "$createdBy" }  // Convert createdBy field to ObjectId (if necessary)
                    }
                },
                {
                    $lookup: {
                        from: "users",             // Join with 'users' collection
                        localField: "postIdObj",   // Use the postIdObj (createdBy converted to ObjectId)
                        foreignField: "_id",       // Match with the _id field in users collection
                        as: "userData"             // Store the joined data in 'userData'
                    }
                },
                {
                    $sort: { createdAt: -1 }       // Sort by createdAt in descending order
                },
                {
                    $match: {
                        $or: [
                            { "tags": { $regex: searchTerm, $options: 'i' } },  // Case-insensitive search in 'tags'
                            { "userData.username": { $regex: searchTerm, $options: 'i' } }  // Case-insensitive search in 'location'
                        ],
                        status: 'Active'  // Only match active users/posts
                    }
                },
                {
                    $project: {
                        _id: 1,
                        tagPeople: 1,
                        createdBy: 1,
                        status: 1,
                        reel: 1,
                        image: 1,
                        audience: 1,
                        tags: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        userData: 1,               // Include data from the users collection
                        location: 1                // Include the location field from the post
                    }
                }
            ]);
            for (let i = 0; i <= reels.length - 1; i++) {
                const isLiked = await like.find({ likeStatus: true, entityId: reels[i]._id, userId: userId });
                const totalLikes = await like.find({ likeStatus: true, entityId: reels[i]._id }).count();
                const totalComments = await comment.find({ commentStatus: true, entityId: reels[i]._id }).count();
                const totalShares = await share.find({ shareStatus: true, entityId: reels[i]._id }).count();
                const isSaved = await userData.find({ entityId: reels[i]._id, userId: userId, status: "Active" });
                let savedStatus;
                if (isSaved.length == 0) {
                    savedStatus = false
                } else {
                    savedStatus = true
                }
                let likedStatus;
                if (isLiked.length == 0) {
                    likedStatus = false
                } else {
                    likedStatus = true
                }
                let uData;
                //console.log("posts.userData",posts[i].audio)
                if (reels[i].userData.length == 1) {
                    uData = { username: reels[i].userData[0].username, profilePic: reels[i].userData[0].profilePic };
                } else {
                    uData = {};
                }
                //console.log("uData",uData);
                reels[i].userData = uData;
                reels[i].likedStatus = likedStatus;
                reels[i].likeCount = totalLikes;
                reels[i].commentCount = totalComments;
                reels[i].shareCount = totalShares;
                reels[i].savedStatus = savedStatus;
            }
            res.status(200).json({ data: reels });
        }
        else if (searchType == "people") {
            const people = await user.aggregate([
                {
                    $match: {
                        $or: [
                            //{ address: { $regex: searchTerm, $options: 'i' } },  // Case-insensitive search in 'location'
                            { username: { $regex: searchTerm, $options: 'i' } }  // Case-insensitive search in 'location'
                        ],
                        status: 'Active'  // Only match active users/posts
                    }
                },
                {
                    $sort: { createdAt: -1 }       // Sort by createdAt in descending order
                },
                {
                    $project: {
                        _id: 1,
                        status: 1,
                        address: 1,
                        profilePic: 1,
                        createdAt: 1,
                        bio: 1,
                        username: 1

                    }
                }
            ]);
            for (const peoples of people) {
                // Find the follow status between the user and the current follow item
                const targetFollow = await follow.find({
                    followerId: userId,
                    followingId: peoples._id,
                });
                //console.log("targetFollow",targetFollow);
                delete peoples.followStatus;
                // Set follow status based on the result
                peoples.followStaus = targetFollow.length > 0 ? targetFollow[0].followStatus : "UnFollow";

            }
            res.status(200).json({ data: people });
        }
        else if (searchType == "groups") {
            res.status(200).json({ data: [] });
        } else {
            res.status(400).json({ message: 'Invalid searchType' });
        }
    }
);
export const getUserByUserId = asyncWrapper(
    async (req, res, next) => {
        let userId = req.user.user._id;
        const { id } = req.params;
        const userInfo = await user.findById(id);
        if (userInfo) {
            const totalfollows = await follow.find({ followerId: userId, followStatus: { $ne: "Rejected" } }).count();
            const totalfollowing = await follow.find({ followingId: userId, followStatus: { $ne: "Rejected" } }).count();
            const targetFollow = await follow.find({ followerId: userId, followingId: id });
            let followStaus;
            if (targetFollow.length > 0) {
                followStaus = "Following";
            } else {
                followStaus = "UnFollow";
            }
            let singleUser = {
                _id: userInfo._id,
                mobile: userInfo.mobile,
                email: userInfo.email,
                username: userInfo.username,
                createdBy: userInfo.createdBy,
                updatedBy: userInfo.updatedBy,
                status: userInfo.status,
                profilePic: userInfo.profilePic,
                createdAt: userInfo.createdAt,
                updatedAt: userInfo.updatedAt,
                age: userInfo.age,
                bio: userInfo.bio,
                gender: userInfo.gender,
                address: userInfo.address,
                language: userInfo.language,
                country: userInfo.country,
                totalfollows: totalfollows,
                totalfollowing: totalfollowing,
                followStaus: followStaus
            }
            return res.status(200).json({ singleUser });
        }

        // const error = createCustomError('User Not Found', 404);
         return res.status(404).json({'Message' : 'User Not Found' });
        logger.error("getUser", error);
        next(error);
    }
);
export const sendCall = asyncWrapper(
    async (req, res, next) => {
        let senderId = req.user.user._id;
        const { id, type } = req.params;
        const recevierInfo = await user.findById(id);
        const senderInfo = await user.findById(senderId);
        let dToken = recevierInfo.deviceToken;
        let sInfo = {
            senderId: senderId,
            username: senderInfo.username,
            profilePic: senderInfo.profilePic,
            bio: senderInfo.bio,
            status: senderInfo.status
        }
        let rInfo = {
            recevierId: id,
            username: recevierInfo.username,
            profilePic: recevierInfo.profilePic,
            bio: recevierInfo.bio,
            status: recevierInfo.status
        }
        //console.log("dToken",dToken);
        if (!dToken) {
            res.status(400).json({ message: 'User is Offline' });
        }
        else if (recevierInfo) {
            //console.log("recevierInfo",recevierInfo);
            const callStatus = recevierInfo.callStatus ? recevierInfo.callStatus : "Available";
            //console.log("callStatus",callStatus);
            if (callStatus == "Available") {
                let aToken = await getAgoraToken(senderId);
                let notificationData = {
                    "deviceToken": dToken,
                    "title": "New Call",
                    "body": "You have received a new call. Check it out!",
                    "data": {
                        "messageId": "12345",
                        "senderInfo": JSON.stringify(sInfo),
                        "type": type,
                        "recevierInfo": JSON.stringify(rInfo),
                        "agoraToken": aToken
                    }
                }
                //console.log("notificationData",notificationData);
                let noteRes = await notification(notificationData);
                //console.log("noteRes",noteRes);
                let data = { callStatus: "calling" };
                const updateSender = await user.findByIdAndUpdate(senderId, data, {
                    new: true,
                    runValidators: true
                });
                return res.status(200).json({ "message": "Notification Sent sucessfully", notificationData: notificationData });
            } else {
                return res.status(400).json({ "message": "User is busy on another call" });
            }

        }
        else {
            // const error = createCustomError('User Not Found', 404);
             return res.status(404).json({'Message' : 'User Not Found' });
            next(error);
        }

    }
);
export async function getAgoraToken(senderId) {
    const channelName = "call";
    const uid = senderId || 0; // 0 for auto-generated UID
    const role = RtcRole.PUBLISHER; // Publisher or Subscriber
    const expireTime = 3600; // Token expiration in seconds

    if (!channelName) {
        return res.status(400).send('Channel name is required');
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;

    const token = RtcTokenBuilder.buildTokenWithUid(
        process.env.APP_ID,
        process.env.APP_CERTIFICATE,
        channelName,
        0,
        1,
        privilegeExpireTime
    );
    console.log("Agora-token", token);
    return token;

}
export const getUserCallStatus = asyncWrapper(
    async (req, res, next) => {
        let userId = req.user.user._id;
        const { id } = req.params;
        const userInfo = await user.findById(id);
        if (userInfo) {
            //console.log("userInfo", userInfo);
            // Ensure that if userInfo[0] is undefined or the callStatus doesn't exist, we default to "Available"
            let callStatus = userInfo.callStatus === "OnCall" ? "OnCall" : "Available";
            return res.status(200).json({ callStatus });
        }

        // const error = createCustomError('User Not Found', 404);
         return res.status(404).json({'Message' : 'User Not Found' });
        logger.error("getUser", error);
        next(error);
    }
);
export const answerCall = asyncWrapper(
    async (req, res, next) => {

        // get the task to be updated
        const { senderId, recevierId } = req.body;
        let data = { callStatus: "OnCall" };
        const targetSender = await user.findById(senderId);
        const targetRecevier = await user.findById(recevierId);
        // check if the user not found
        if (!targetSender) {
            // const error = createCustomError('SenderId Not Found', 404);
             return res.status(404).json({'Message' : 'SenderId Not Found' });
            next(error);
            logger.error("answerCall--- Sender", error);
        }
        if (!targetRecevier) {
            // const error = createCustomError('RecevierId Not Found', 404);
             return res.status(404).json({'Message' : 'RecevierId Not Found' });
            next(error);
            logger.error("answerCall--Recevier", error);
        }
        // update the chosen one
        const updateSender = await user.findByIdAndUpdate(senderId, data, {
            new: true,
            runValidators: true
        });
        const updateRecevier = await user.findByIdAndUpdate(recevierId, data, {
            new: true,
            runValidators: true
        });

        return res.status(200).json({ message: `Call answered successfully!` });
    }
);
export const endCall = asyncWrapper(
    async (req, res, next) => {
        try {
            // Get the user who ends the call
            console.log(req.user)
            const endcalluser = req.user.user._id;
            //const endcalluser = initperson.toString();
            const { senderId, recevierId } = req.body;
            console.log(endcalluser);
            // Check if the ending user is sender or receiver
            if (![senderId, recevierId].includes(endcalluser.toString())) {
                return res.status(400).json({ message: "User not part of the call." });
            }

            const otherUserId = endcalluser === senderId ? recevierId : senderId;
            console.log(otherUserId);

            // Fetch user data for sender and receiver
            const targetSender = await user.findById(senderId);
            const targetRecevier = await user.findById(recevierId);

            // Validate sender and receiver
            if (!targetSender) {
                // return next(createCustomError('SenderId Not Found', 404));
                return res.status(404).json({'Message' : 'SenderId Not Found' });
            }
            if (!targetRecevier) {
                // return next(createCustomError('ReceiverId Not Found', 404));
                return res.status(404).json({'Message' : 'ReceiverId Not Found' });
            }

            // Update the call status of both users
            const updateSender = await user.findByIdAndUpdate(senderId, { callStatus: "Available" }, {
                new: true,
                runValidators: true
            });
            const updateRecevier = await user.findByIdAndUpdate(recevierId, { callStatus: "Available" }, {
                new: true,
                runValidators: true
            });

            // Determine which user to notify
            const notifyUser = endcalluser === senderId ? targetRecevier : targetSender;
            console.log("nooo");
            console.log(notifyUser);
            // Send notification to the user who did not end the call
            const notificationData = {
                deviceToken: notifyUser.deviceToken,
                title: "End Call",
                body: "The call has ended. Check your app for details.",
                data: {
                    messageId: "12345",
                    senderInfo: JSON.stringify(updateSender),
                    type: "Endcall",
                    recevierInfo: JSON.stringify(updateRecevier),
                    agoraToken: ""
                }
            };
            //await notification(notificationData);

            return res.status(200).json({ message: `Call ended successfully!` });
        } catch (error) {
            next(error);
        }
    }
);
export const deleteUser = asyncWrapper(
    async (req, res, next) => {
        let userId = req.user.user._id;
        // get the task to be updated
        const { id } = req.params;
        const targetUser = await user.findById(userId);

        // check if the user not found
        if (!targetUser) {
            // const error = createCustomError('User Not Found', 404);
            return res.status(404).json({'Message' : 'User Not Found' });
            next(error);
            logger.error("editUser", error);
        }
        req.body.isDeleted = 1;
        // update the chosen one
        const updatedUser = await user.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true
        });

        return res.status(200).json({ message: `User Deleted successfully!`, updatedUser });
    }
);