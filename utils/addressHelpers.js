// helpers/addressHelpers.js
import Address from "../DB/models/address.js";

export const addAddress = async (data) => {
  const address = new Address(data);
  await address.save();
  return address.id;
};
