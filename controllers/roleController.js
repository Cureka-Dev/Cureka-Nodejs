import Role from "../DB/models/roles.js";
import { addUserLogs } from '../utils/common.js';
// 🔹 Auto-generate sequential numeric ID
const getNextRoleId = async () => {
  const latest = await Role.findOne().sort({ id: -1 }).limit(1);
  return latest ? latest.id + 1 : 1;
};

// ➤ Add Role
export const addRole = async (req, res) => {
  try {
    const { name, created_by } = req.body;
    console.log("22",req.user)

    if (!name || !created_by) {
      return res.status(400).json({ message: "Name and created_by are required", error: true });
    }

    const newId = await getNextRoleId();
    const newRole = await Role.create({ id: newId, name, created_by });

    await addUserLogs({
      user_id: "",
      payload: JSON.stringify(req.body),
      response: JSON.stringify(newRole),
      type: "addRoles",
    });

    res.status(201).json({ message: "Role added successfully", error: false, data: newRole });
  } catch (error) {
    console.error("Error adding role:", error);
    res.status(500).json({ message: error.message, error: true });
  }
};

// ➤ Get All Active Roles
export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find({ status: "Active" });
    res.status(200).json({ error: false, message: "List fetched successfully", results: roles });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// ➤ Edit Role
export const editRole = async (req, res) => {
  try {
    const { name, updated_by, status } = req.body;
    const { id } = req.params;

    if (!id) return res.status(400).json({ error: true, message: "Role ID is required" });

    await Role.updateOne({ id: Number(id) }, { $set: { name, updated_by, status } });

    await addUserLogs({
      user_id: req.user?._id || "",
      payload: JSON.stringify(req.body),
      response: JSON.stringify({}),
      type: "editRoles",
    });

    res.status(200).json({ error: false, message: "Role updated successfully" });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// ➤ Get Role by ID
export const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findOne({ id: Number(id) });

    if (!role) return res.status(404).json({ error: true, message: "Role not found" });

    res.status(200).json({ error: false, message: "Role retrieved successfully", data: role });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// ➤ Soft Delete Role
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    await Role.updateOne({ id: Number(id) }, { $set: { status: "Deleted" } });

    await addUserLogs({
      user_id: req.user?._id || "",
      payload: JSON.stringify(req.body),
      response: JSON.stringify({}),
      type: "deleteRoles",
    });

    res.status(200).json({ error: false, message: "Role deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};

// ➤ Get All Roles (except Deleted)
export const getAllAdminRoles = async (req, res) => {
  try {
    const roles = await Role.find({ status: { $ne: "Deleted" } });
    res.status(200).json({ error: false, message: "List fetched successfully", results: roles });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
};
