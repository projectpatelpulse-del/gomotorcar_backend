const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gomotorcar');
    const FranchiseeProfile = require('./src/models/franchiseeProfile.model');
    const profile = await FranchiseeProfile.findOne({ userId: '6a3ad8f4440e2897e20de5b9' }).lean();
    console.log(JSON.stringify(profile, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
