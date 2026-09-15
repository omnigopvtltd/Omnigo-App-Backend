const Onboarding = require("../models/Onboarding");


// CREATE
exports.createOnboarding = async (req, res) => {
  try {
    const {
      title,
      description,
      order,
      image_url,
    } = req.body;

   
    if (!req.file && !req.body.image_url) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    const onboarding =
      await Onboarding.create({
        title,
        description,
        order,
        image_url: image_url || `/uploads/${req.file.filename}`,
      });

    res.status(201).json({
      success: true,
      message: "Onboarding created successfully",
      data: onboarding,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// GET ALL
exports.getOnboardings = async (req, res) => {
  try {

    const data = await Onboarding
      .find()
      .sort({ order: 1 });

    res.json({
      success: true,
      message: "Onboarding data fetched successfully",
      data,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// GET SINGLE
exports.getOnboardingById = async (
  req,
  res
) => {
  try {

    const onboarding =
      await Onboarding.findById(
        req.params.id
      );

    if (!onboarding) {
      return res.status(404).json({
        success: false,
        message: "Onboarding not found",
      });
    }

    res.json({
      success: true,
      data: onboarding,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// UPDATE
exports.updateOnboarding = async (
  req,
  res
) => {
  try {

    const onboarding =
      await Onboarding.findById(
        req.params.id
      );

    if (!onboarding) {
      return res.status(404).json({
        success: false,
        message: "Onboarding not found",
      });
    }

    onboarding.title =
      req.body.title ||
      onboarding.title;

    onboarding.description =
      req.body.description ||
      onboarding.description;

    onboarding.order =
      req.body.order ||
      onboarding.order;

    if (req.file) {
      onboarding.image_url =
        `/uploads/${req.file.filename}`;
    }

    await onboarding.save();

    res.json({
      success: true,
      message: "Onboarding updated successfully",
      data: onboarding,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// DELETE
exports.deleteOnboarding = async (
  req,
  res
) => {
  try {

    const onboarding =
      await Onboarding.findById(
        req.params.id
      );

    if (!onboarding) {
      return res.status(404).json({
        success: false,
        message: "Onboarding not found",
      });
    }

    await onboarding.deleteOne();

    res.json({
      success: true,
      message: "Onboarding deleted successfully",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


// ACTIVE / INACTIVE
exports.toggleOnboardingStatus =
  async (req, res) => {
    try {

      const onboarding =
        await Onboarding.findById(
          req.params.id
        );

      if (!onboarding) {
        return res.status(404).json({
          success: false,
          message: "Onboarding not found",
        });
      }

      onboarding.isActive =
        !onboarding.isActive;

      await onboarding.save();

      res.json({
        success: true,
        message: "Status updated successfully",
        data: onboarding,
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message,
      });

    }
  };