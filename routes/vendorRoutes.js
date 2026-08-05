const express=require("express");
const router=express.Router();

const {
     vendorLogin,
 verifyVendorOtp,
 createVendor,
 getVendors,
 getVendorById,
 updateVendor,
 updateVendorStatus,
 deleteVendor
}=require("../controllers/vendorController");

const authMiddleware = require("../middleware/authMiddleware");


router.post(
    "/create",
    authMiddleware,
    createVendor
);


router.get(
    "/",
    authMiddleware,
    getVendors
);


router.get(
    "/:id",
    authMiddleware,
    getVendorById
);


router.put(
    "/:id",
    authMiddleware,
    updateVendor
);


router.put(
    "/:id/status",
    authMiddleware,
    updateVendorStatus
);


router.delete(
    "/:id",
    authMiddleware,
    deleteVendor
);

router.post(
 "/login",
 vendorLogin
);


router.post(
 "/verify-otp",
 verifyVendorOtp
);


module.exports=router;