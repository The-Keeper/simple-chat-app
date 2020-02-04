"use strict";

module.exports = function(io, db, passportSocketIo) {
    /* set up sockets */
    io.on('connection', socket => {
        console.log("User", socket.request.user.id, "connected")
        const user_con_path = 'user' + socket.request.user.id
        socket.join(user_con_path);      // individual user connections

      socket.on('user-login', name => {
        //users[socket.id] = name
        socket.broadcast.emit('user-connected', name)
      })

      async function reqAddUserToRoom(user_id, room_id) {
          const res = await db.AddUserToRoom(user_id, room_id)
          const user_info = await db.ReturnUserInfo(user_id)
          const room_info = await db.ReturnRoomInfo(room_id)

          passportSocketIo.filterSocketsByUser(io, function(user){
                return user.id == user_id;
              }).forEach(function(socket){
                socket.join(room_id);
              });

          const user_name = user_info.name
          const room_name = room_info.name
          io.in(room_id).emit('user-added', {user_id, user_name, room_id, room_name});
      }

      socket.on('create-room', name => {
          db.CreateRoom(name).then(res => {
              console.log('ROOM CREATED', name, res[0])
             reqAddUserToRoom(socket.request.user.id, res[0])
         })
      })


        socket.on('add-user-to-room', args => {
            reqAddUserToRoom(args.user_id, args.room_id)
        })

      socket.on('request-free-users', room_id => {
        db.ReturnUsersNotInRoom(room_id)
        .then(res => {
            io.to(socket.id).emit('free-users', res);
        })
      })

      socket.on('send-chat-message', message => {
          const tag  = message['tag']        // tag to identify message to user
          delete message['tag']              // it's an unnecessary field
          const room_id = message['room_id']

          if (room_id !== null && tag !== null) {
              console.log('RECV, MSG', tag);

              // assume other input data is correct
              // put the message to database
              const timestamp = Date.now();
              message['timestamp'] = timestamp;
              message['sender_id'] = socket.request.user.id;

              console.log('MSG', message);
              db.AddMessage(message).then(id => {
                  let new_id = id[0]
                  message['id'] = new_id

                  // 1. broadcast message to everyone else in the room;
                  socket.to(room_id).emit('chat-message', message );
                  // 2. send 'message recieved' to sender
                  io.to(socket.id).emit('msg-recieved', { tag: tag, id: new_id, timestamp: timestamp });
                //  socket.to(user_con_path).emit('msg-recieved', { tag: tag_id, new_tag: id });
              })

          }
      })

        socket.on('delete-message', async (args) => {
            let id = args.id;
            const msg = await db.ReturnMessageInfo(id);
            let {room_id, sender_id} = msg;

                //only sender can delete their messages
            if (msg.sender_id == socket.request.user.id) {
                db.DeleteMessage(id).then(() => {
                    // send to everyone, including sender
                    io.to(room_id).emit('message-deleted', {id, sender_id})
                })
            }
        })

      socket.on('request-last-messages', async () => {
          // return list of registered rooms and last messages in each of them

          const rooms_list = await db.ReturnUserRooms(socket.request.user.id)
          const user_room_info = await db.ReturnRoomsInfo(rooms_list)
          const last_msg = await db.ReturnLastMessages(rooms_list)

          // res = { room_id: {msg: [messages], user_data: [users]} }
          // generic function (so that rooms database can be extended)
          const res = user_room_info.reduce((acc, item) => {
              acc[item.id] = (({ id, ...rest }) => ({...rest, msg: [] }))(item);
              return acc
            }, {})

            for (let m of last_msg) {
                res[m.room_id]['msg'].push(
                    m
                    // (({ room_id, ...rest }) => ({...rest }))(m) // TODO: should the room_id be excluded
                )
            }

            // append user info to rooms;
            // properly should be on per-room basis
            // but since we have a common room,
            // we'll add info about all users to the first room
            const user_info = await db.ReturnAllUsers()
            res[0]['user_data'] = user_info

            // connect user to all his rooms_list
            for (let r of rooms_list)
                socket.join(r)

            // return message history
            io.to(socket.id).emit('msg-history', res);
       })

      socket.on('request-message-history', args => {
          // args.room_id = Int // if no, return all rooms
          // args.last_msg_id  = Int // message_id, search before it

          db.ReturnMessageHistory(args.room_id, args.last_msg_id).then(msg_list => {
                        // send message history to sender
                        const res = {};
                        res[args.room_id] = { 'msg': msg_list }
                        io.to(socket.id).emit('msg-history', res);
                    })
      })

      socket.on('disconnect', () => {
          // socket has already left all "rooms"
      })
})



}
