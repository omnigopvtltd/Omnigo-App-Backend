const Vendor = require("../models/Vendor");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// =====================================
// ADMIN: CREATE VENDOR ACCOUNT
// =====================================
// exports.createVendor = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       phone,
//       password,
//       shopName,
//       shopAddress,
//       category,
//     } = req.body;

//     if (!name || !email || !phone || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "name, email, phone and password are required",
//       });
//     }

//     const existing = await Vendor.findOne({ email });

//     if (existing) {
//       return res.status(400).json({
//         success: false,
//         message: "Vendor with this email already exists",
//       });
//     }

//     const vendor = await Vendor.create({
//       name,
//       email,
//       phone,
//       password,
//       role: "vendor",

//       vendorProfile: {
//         shopName: shopName || "",
//         shopAddress: shopAddress || "",
//         category: category || "",
//         isActive: true,
//       },
//     });

//     const token = jwt.sign(
//       {
//         id: vendor._id,
//         role: vendor.role,
//       },
//       process.env.JWT_SECRET,
//       {
//         expiresIn: "30d",
//       }
//     );

//     const vendorSafe = vendor.toObject();
//     delete vendorSafe.password;

//     return res.status(201).json({
//       success: true,
//       message: "Vendor created successfully",
//       token,
//       vendor: vendorSafe,
//     });
//   } catch (err) {
//     console.log("CREATE VENDOR ERROR:", err);

//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };
   // =====================================
// ADMIN: CREATE VENDOR ACCOUNT
// =====================================
exports.createVendor = async (req, res) => {
  try {

    const {
      name,
      email,
      phone,
      password,
      shopName,
      shopAddress,
      category,
    } = req.body;


    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "name, email, phone and password are required",
      });
    }



    const existing = await Vendor.findOne({ email });


    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A vendor with this email already exists",
      });
    }



    // Vendor Create
    const vendor = await Vendor.create({

      name,

      email,

      phone,

      password,

      role: "vendor",


      vendorProfile: {

        shopName: shopName || "",

        shopAddress: shopAddress || "",

        category: category || "",

        isActive: false,   // login ke baad activate kar sakte ho

      },

    });



    // JWT Token Generate
    const token = jwt.sign(

      {
        id: vendor._id,

        role: vendor.role,
      },


      process.env.JWT_SECRET,


      {
        expiresIn: "30d",
      }

    );



    const vendorSafe = vendor.toObject();

    delete vendorSafe.password;



    return res.status(201).json({

      success: true,

      message: "Vendor created successfully",

      token,

      vendor: vendorSafe,

    });



  } catch (err) {


    console.log("CREATE VENDOR ERROR:", err);


    return res.status(500).json({

      success:false,

      message:err.message,

    });


  }
};
// =====================================
// ADMIN: GET ALL VENDORS
// =====================================
exports.getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().select("-password");

    return res.status(200).json({
      success: true,
      vendors,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// ADMIN: GET SINGLE VENDOR
// =====================================
exports.getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).select("-password");

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    return res.status(200).json({
      success: true,
      vendor,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// ADMIN: UPDATE VENDOR
// =====================================
exports.updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const {
      name,
      phone,
      shopName,
      shopAddress,
      category,
    } = req.body;

    if (name) vendor.name = name;
    if (phone) vendor.phone = phone;

    if (shopName) vendor.vendorProfile.shopName = shopName;
    if (shopAddress) vendor.vendorProfile.shopAddress = shopAddress;
    if (category) vendor.vendorProfile.category = category;

    await vendor.save();

    const vendorSafe = vendor.toObject();
    delete vendorSafe.password;

    return res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      vendor: vendorSafe,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// ADMIN: BLOCK / UNBLOCK VENDOR
// =====================================
exports.updateVendorStatus = async (req, res) => {
  try {
    const { isBlocked } = req.body;

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      {
        isBlocked: !!isBlocked,
      },
      {
        new: true,
      }
    ).select("-password");

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Vendor ${
        isBlocked ? "blocked" : "unblocked"
      } successfully`,
      vendor,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// =====================================
// ADMIN: DELETE VENDOR
// =====================================
exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.vendorLogin = async (req,res)=>{
    try {

        const {phone,password}=req.body;


        if(!phone || !password){
            return res.status(400).json({
                success:false,
                message:"Phone and password required"
            });
        }


        const vendor = await Vendor.findOne({phone});


        if(!vendor){
            return res.status(404).json({
                success:false,
                message:"Vendor not found"
            });
        }


        if(vendor.isBlocked){
            return res.status(403).json({
                success:false,
                message:"Your account is blocked"
            });
        }


        const match = await bcrypt.compare(
            password,
            vendor.password
        );


        if(!match){
            return res.status(400).json({
                success:false,
                message:"Invalid password"
            });
        }


        // Generate OTP
        const otp = Math.floor(
            100000 + Math.random()*900000
        ).toString();


        vendor.otp = otp;

        vendor.otpExpire =
        Date.now() + 5*60*1000;


        await vendor.save();



        // Yahan SMS service lagegi
        // Abhi testing ke liye console
        console.log(
          "OTP:",
          otp
        );


        return res.status(200).json({
            success:true,
            message:"OTP sent successfully",
            phone
        });



    } catch(err){

        res.status(500).json({
            success:false,
            message:err.message
        })

    }
};   


// =====================================
// VERIFY OTP LOGIN
// =====================================
exports.verifyVendorOtp = async(req,res)=>{

    try{

        const {phone,otp}=req.body;


        const vendor = await Vendor.findOne({
            phone
        });


        if(!vendor){
            return res.status(404).json({
                success:false,
                message:"Vendor not found"
            });
        }



        if(
          vendor.otp !== otp ||
          vendor.otpExpire < Date.now()
        ){

            return res.status(400).json({
                success:false,
                message:"Invalid or expired OTP"
            });

        }



        // OTP clear
        vendor.otp = null;
        vendor.otpExpire = null;


        // Phone verified
        vendor.isPhoneVerified = true;


        // Last login update
        vendor.lastLogin = new Date();


        await vendor.save();



        const token = jwt.sign(
            {
                id: vendor._id,
                role: "vendor"
            },
            process.env.JWT_SECRET,
            {
                expiresIn:"30d"
            }
        );



        const vendorSafe = vendor.toObject();

        delete vendorSafe.password;



        return res.status(200).json({

            success:true,
            message:"Login successful",
            token,
            vendor: vendorSafe

        });



    }catch(err){

        return res.status(500).json({
            success:false,
            message:err.message
        });

    }

};