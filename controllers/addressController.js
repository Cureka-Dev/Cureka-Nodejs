import Address from "../DB/models/address.js";

// Utility for consistent error handling
const handleError = (res, message, err) => {
  console.error(message, err);
  res.status(500).json({ error: "Internal Server Error" });
};

// Add new address
export const addAddrress = async (req, res) => {
  // ✅ Use _id instead of id
  const userId = req.user.id;  

  const {
    name, email, mobile, address, landmark, pincode,
    address_type, other_title, city, state,latitute,logitude,
  } = req.body;

  if (!name || !email || !mobile || !address || !pincode || !address_type || !landmark) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 🔹 Get latest id from Address collection
    const latestAddress = await Address.findOne().sort({ id: -1 }).lean();
    const newId = latestAddress ? latestAddress.id + 1 : 1;

    // 🔹 Create new address with incremental id and user_id
    const newAddress = await Address.create({
      id: newId,
      userId,   // ✅ fixed
      name,
      email,
      mobile,
      address,
      landmark,
      pincode,
      address_type,
      other_title,
      city,
      state,
      latitute,
      logitude
    });

    res.status(201).json({
      id: newAddress.id,
      message: "Address Inserted Successfully"
    });
  } catch (error) {
    res.status(500).json({
      error: "Error inserting address",
      errorMessage: error.message
    });
  }
};



// Update existing address
export const updateAddress = async (req, res) => {
  const addressId = req.params.addressId;
  const {
    name, email, mobile, address, landmark, pincode,
    address_type, other_title, city, state,latitute,logitude
  } = req.body;

  if (!name || !email || !mobile || !address || !pincode || !address_type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const updated = await Address.findByIdAndUpdate(addressId, {
      name, email, mobile, address, landmark, pincode,
      address_type, other_title, city, state,latitute,logitude
    }, { new: true });

    if (!updated) {
      return res.status(404).json({ error: "Address not found" });
    }

    res.status(200).json({ message: "Address updated successfully" });
  } catch (error) {
    handleError(res, "Error updating address:", error);
  }
};

// Get addresses by user
export const getAddresses = async (req, res) => {
  const userId = req.user.id;
  //console.log("user_id",userId);

  try {
    const addresses = await Address.find({ userId:userId, status: "Active" });
    res.status(200).json(addresses);
  } catch (error) {
    handleError(res, "Error retrieving addresses:", error);
  }
};

// Soft delete address
export const deleteAddress = async (req, res) => {
  const addressId = req.params.addressId;

  try {
    const deleted = await Address.findByIdAndUpdate(
      addressId,
      { status: "Deleted" },
      { new: true }
    );

    if (!deleted) {
      return res.status(404).json({ error: "Address not found" });
    }

    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    handleError(res, "Error deleting address:", error);
  }
};
