module.exports = {
  default: {
    require: ["feature/step_definitions/**/*.js"],
    paths: ["feature/**/*.feature"],
    publishQuiet: true,
  },
};
