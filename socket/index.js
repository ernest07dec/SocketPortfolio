const PORT = 8800;

const io = require("socket.io")(PORT, {
  cors: {
    origin: "*",
  },
});
let activeUsersChatRoom = [];
let videoRoom = [];

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

  // //////////////////VIDEO CALL///////////////////////////////////////
  //VIDEOCALL ROOM JOIN
  // VIDEOCALL ROOM JOIN
  socket.on("room:join", (data) => {
    const { room } = data;

    const successJoin = ({ room, members }) => {
      socket.join(room);
      io.to(room).emit("user:joined", {
        room,
        members,
      });
    };

    // Check if the room already exists in the videoRoom array
    const existingRoom = videoRoom.find((el) => el.room === room);

    if (existingRoom) {
      // Check if there are fewer than 2 members in the room
      if (existingRoom.members.length < 2) {
        // Add the user inside the room
        existingRoom.members.push(socket.id);
        successJoin(existingRoom); // Call the successJoin function with updated data
      } else {
        // Emit a signal to the user that they cannot enter since there are already 2 members
        socket.emit("user:cannot:join", {
          message: "Room is full. Cannot join.",
        });
      }
    } else {
      // If the room doesn't exist, create a new room and add the user
      const newRoom = { room, members: [socket.id] };
      videoRoom.push(newRoom);
      socket.join(room);
      successJoin(newRoom); // Call the successJoin function with the new room data
    }
    console.log(videoRoom);
  });

  //JOIN CALL CLICKED //RECEIVE OFFER FROM CALLER
  socket.on("user:call", ({ to, offer }) => {
    //SEND OFFER TO RECEIPIENT
    io.to(to).emit("incoming:call", {
      from: socket.id,
      offer,
    });
  });
  // JOIN CALL CLICKED //RECEIVE ANSWER FROM RECEIPIENT
  socket.on("call:accepted", ({ to, ans }) => {
    //SEND ANSWER TO CALLER
    io.to(to).emit("call:accepted", {
      from: socket.id,
      ans,
    });
  });
  //ADDITIONAL PERMISSIONS IF NEEDED// OFFER
  socket.on("peer:nego:needed", ({ to, offer }) => {
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });
  //ADDITIONAL PERMISSIONS IF NEEDED// ANSWER
  socket.on("peer:nego:done", ({ to, ans }) => {
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });
  //CAMERA OFF/ON
  socket.on("camera:toggle", ({ camera, to }) => {
    socket.to(to).emit("camera:toggle", {
      camera,
      from: activeUsers.find(() => (user) => user.socketId === to),
    });
  });
  //AUDIO OFF/ON
  socket.on("audio:toggle", ({ audio, to }) => {
    socket.to(to).emit("audio:toggle", {
      audio,
      from: activeUsers.find(() => (user) => user.socketId === to),
    });
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
