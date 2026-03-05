export const markUnclosedSessionsAsCrashed = async (SessionModel) => {
  const sessions = await SessionModel.find({ status: "Active" });

  for (const session of sessions) {
    session.status = "Crashed";
    session.logoutTime = new Date();
    await session.save();
  }
};