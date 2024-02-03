const PORT = 8800;

const io = require("socket.io")(PORT, {
  cors: {
    origin: "*",
  },
});
let activeUsersChatRoom = [];
io.on("connection", (socket) => {
  // ///////////CHATROOM/////////////////////////////////////////////////////
  socket.on("chatroom:new-user-add", (newUserName) => {
    const userExists = activeUsersChatRoom.some(
      (user) => user.socketId === socket.id
    );
    if (!userExists) {
      activeUsersChatRoom.push({ username: newUserName, socketId: socket.id });
    }
    io.emit("chatroom:active-users", activeUsersChatRoom);
  });

  // send a message to all connected
  socket.on("chatroom:send", (data) => {
    console.log(data);
    const receivers = activeUsersChatRoom.filter((user) => {
      return user.socketId !== socket.id;
    });
    if (receivers) {
      // SEND TO ALL ACTIVE SESSIONS OF USERS
      receivers.forEach((user) => {
        io.to(user.socketId).emit("chatroom:receive", data);
      });
    }
  });
  // update username
  socket.on("chatroom:update-username", (newUserName) => {
    const userIndex = activeUsersChatRoom.findIndex(
      (user) => user.socketId === socket.id
    );

    // If the user is found, update the username
    if (userIndex !== -1) {
      activeUsersChatRoom[userIndex].username = newUserName;

      // Emit an event to inform all clients about the updated username
      io.emit("chatroom:active-users", activeUsersChatRoom);
    }
  });
  // raise hand
  socket.on("chatroom:raise-hand", (username) => {
    // Emit an event to inform all clients about the raisehand
    io.emit("chatroom:hand-raised", { username });
  });

  //DISCONNECTED USERS
  socket.on("disconnect", () => {
    // remove the user from active users
    activeUsersChatRoom = activeUsersChatRoom.filter(
      (user) => user.socketId !== socket.id
    );
    // If the host disconnected, notify all room members

    // send all active users to all users
    io.emit("chatroom:active-users", activeUsersChatRoom);
  });
});
