const User = require('./User');
const Course = require('./Course');
const CourseRegistration = require('./CourseRegistration');
const RecommendedCourse = require('./RecommendedCourse');
const Notification = require('./Notification');
const PointsTransaction = require('./PointsTransaction');

// 定義關聯
User.hasMany(CourseRegistration);
CourseRegistration.belongsTo(User);

Course.hasMany(CourseRegistration);
CourseRegistration.belongsTo(Course);

User.hasMany(RecommendedCourse, { foreignKey: 'user_id' });
RecommendedCourse.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Notification);
Notification.belongsTo(User);

User.hasMany(PointsTransaction);
PointsTransaction.belongsTo(User);

module.exports = {
  User,
  Course,
  CourseRegistration,
  RecommendedCourse,
  Notification,
  PointsTransaction
};