"use strict";

const socket = io('http://localhost:3000')
const roomListContainer = document.getElementById('room-list-container')
const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')
const bodyContainer = document.getElementById('body-container')
const modalRoomSettings = document.getElementById('room-modal')
const modalAllRooms = document.getElementById('all-rooms-modal')
const roomSettings = document.getElementById('room-settings-open')
const addUserToRoomBtn = document.getElementById('add-user-to-room')
const selFU = document.getElementById('free-user-list');
const roomUL = document.getElementById('room-list')
const el_newRoomName = document.getElementById('add-room-newroomname')
el_newRoomName.value = ''

const userID  = bodyContainer.dataset.userId;
var activeRoomID = -1;
var activeChatOL = null;
const userIdNameMap = {} // {user_id: user_name}

// messages that were sent are awaited to callback from server
var sent_msg = {}; // {tag: message}

socket.emit('user-login', name)
//socket.emit('request-message-history', {room: roomID})
socket.emit('request-last-messages')

socket.on('chat-message', data => {
    var rEL = getRoomDIV(data.room_id)
    var roomOL = rEL.querySelector('ol')
    createMessage(roomOL, data)
})

/*
socket.on('user-connected', name => {
  appendMessage(`${name} connected`)
})

socket.on('user-disconnected', name => {
  appendMessage(`${name} disconnected`)
})
*/

socket.on('message-deleted', args => {
    const msgElement = document.getElementById('room-list-container')
                             .querySelector(`li[data-msg-id='${args.id}']`)
    let newSysMsg    = genSystemMessage(`Сообщение пользователя ${userIdNameMap[args.sender_id]} удалено`)
    msgElement.parentNode.replaceChild(newSysMsg, msgElement);
})

socket.on('msg-recieved', data => {
    var tag     = data.tag
    var new_msg = sent_msg[tag];
    delete sent_msg[tag];
    new_msg['id'] = data.id
    new_msg['timestamp'] = data.timestamp
    new_msg['sender_id'] = userID;
    var chatOL = getRoomDIV(new_msg.room_id).querySelector('.chat-container')
    createMessage(chatOL, new_msg)
})

function deleteMessageCallback(event) {
    var msgElement = event.target.closest('.msg');
    let msg_id = msgElement.dataset.msgId;

    UIkit.modal.confirm('Удалить сообщение?').then(function() {
        socket.emit('delete-message', {"id": msg_id})
    }, function () {
        console.log('Cancelled.')
    });
}

/* generates system message */
function genSystemMessage(text) {
    const res = document.createElement("div")
    res.classList.add('sysmsg')
    res.append(text)
    return res;
}

function createMessage(chatOL, m, prepend = false) {
    if (!chatOL.querySelector(`li[data-msg-id='${m.id}']`)) {
    var msgLI = document.createElement("li");
    msgLI.classList.add('msg');
    if (m.sender_id == userID) {
        msgLI.classList.add('self')
    } else {
        msgLI.classList.add('other')
    }
    msgLI.dataset.msgId = m.id;
    var msgContent = document.createElement("div");
    msgContent.classList.add('msg-content');

    if (m.sender_id == userID) {
        let closebutton = document.createElement("a");
        closebutton.setAttribute("uk-close","");
        closebutton.classList.add("uk-align-right")
        closebutton.addEventListener('click', event => deleteMessageCallback(event))
        msgContent.prepend(closebutton)
    }

    msgContent.insertAdjacentHTML('afterbegin', `<div class="user">${userIdNameMap[m.sender_id]}</div>`);

    if (m.type == 0) {
        for (let line of m.value.split('\n')) {
            let par = document.createElement("p")
            par.append(line)
            msgContent.append(par)
        }
    }


    let moment_ts = moment.unix(m.timestamp/1000)

    let dateStr = moment_ts.format('L');
    console.log('Date string:',dateStr)
    var timeStr = moment_ts.format('LT');
    if (moment().format('L') !== dateStr) {
        timeStr = dateStr + ', ' + timeStr;
    }
    msgContent.insertAdjacentHTML('beforeend', `<time>${timeStr}</time>`);

    msgLI.append(msgContent)
    if (prepend) {
        chatOL.prepend(msgLI)
    } else {
        chatOL.append(msgLI)
        }
    }
}

function requestHistory(room_id) {
    var roomDIV = getRoomDIV(room_id)
    //var chatContainer = roomDIV.querySelector('.chat-container')
    var oldestMsg    = roomDIV.querySelector('.msg')
    if (oldestMsg) {
    var msg_id        = oldestMsg.dataset.msgId
    roomDIV = document.getElementById('room-list')
    socket.emit('request-message-history', {'room_id': room_id, 'last_msg_id': msg_id})
    }
}

function getRoomDIV(room_id) {
    return document.getElementById('room-list-container')
            .querySelector(`div[data-room-id='${room_id}']`)
}

function ToggleRoomActivation(room_id) {
    let roomDIV = getRoomDIV(room_id)
    roomDIV.classList.toggle('active')
    bodyContainer.classList.toggle('chat-open')

    if (roomDIV.classList.contains('active')) {
        // chat is now open
        activeRoomID = room_id;
        requestHistory(activeRoomID)
    } else {
        // chat is now closed
        activeRoomID = -1;
    }

}

function makeRoom(room_id, r) {
    var roomDIV = getRoomDIV(room_id);
    if (!roomDIV) {
        roomDIV = document.createElement("div");
        roomDIV.classList.add('room-item');
        roomDIV.dataset.roomId = room_id;
        roomDIV.innerHTML = `<ol class="chat-container"></ol>`
        roomUL.append(roomDIV)

    //if (!(!r || !r.name)) {
    if (r && r.name) {
        let header = document.createElement("h3");
        header.innerHTML = '<span uk-icon="icon: triangle-left; ratio: 2"</span>'
   //     header.classList.add('uk-light', 'uk-background-secondary', 'uk-padding');
        header.append(r.name)
        roomDIV.prepend(header)

//
//

        roomDIV.addEventListener('click', event => {
            if (activeRoomID>=0) {
                if (event.target == header) {
                    header.removeAttribute('uk-sticky')
                    ToggleRoomActivation(roomDIV.dataset.roomId)
                }
            } else {
                ToggleRoomActivation(roomDIV.dataset.roomId)
                header.setAttribute('uk-sticky','bottom: #top');
            }
           });
        }
    }
    return roomDIV;
}

socket.on('msg-history', data => {
    // sort by id
    //console.log('MSG-HISTORY', data, JSON.stringify(data))
    for (let [room_id, r] of Object.entries(data)) {
         let roomItemDIV = makeRoom(room_id, r)
         const chatOL = roomItemDIV.querySelector('.chat-container');

        // map user data
         if (r.user_data) {
            for (let u of r.user_data) {
                userIdNameMap[u.id] = u.name
            }
         }

         for (let m of r.msg) {
            createMessage(chatOL, m, true)
          }
    }
})

function newMsgTag(tags_dict) {
    var res = 0;
    while (tags_dict[res]!=null)
        res += 1
    return res;
}

messageForm.addEventListener('submit', e => {
  e.preventDefault()
  const tag = newMsgTag(sent_msg)
  const message = {
    type: 0, // 0 - text, 1 - image
    value:  messageInput.value, // text / data hash
    room_id: activeRoomID,
    tag: tag
  }
  sent_msg[tag] = message;
  socket.emit('send-chat-message', message)
  // socket.emit('request-message-history', message)
  messageInput.value = ''
})

modalAllRooms.addEventListener('show', function(){
  el_newRoomName.focus();
});


roomSettings.onclick = function(){
        socket.emit('request-free-users', activeRoomID);
}

socket.on('free-users', res => {
    if (res.length > 0) {
    selFU.innerHTML = res.map(e => {
        return `<option value=${e.id}>${e.name}</option>`
    }).join('')
    //addUserToRoomBtn.removeAttribute('disabled');
    modalRoomSettings.classList.remove('room-full')
} else {
    selFU.innerHTML = ""
    //addUserToRoomBtn.setAttribute("disabled","");
    modalRoomSettings.classList.add('room-full')

}
    UIkit.modal(modalRoomSettings).show()
})

addUserToRoomBtn.onclick = function(){
    socket.emit('add-user-to-room', {user_id: selFU.value, room_id: activeRoomID});
    UIkit.modal(modalRoomSettings).hide()
}
document.getElementById('add-room-add').onclick = function(){
    const new_name = el_newRoomName.value;
    el_newRoomName.value = '';
    const modal    = document.getElementById('all-rooms-modal')
    if (new_name.length > 0) {
        socket.emit('create-room', new_name)
    } else {
        console.log('No name')
    }
    UIkit.modal(modal).hide();
}

socket.on('user-added', data => {
    // UIkit.modal.alert(JSON.stringify(data));
    let roomDIV = makeRoom(data.room_id, {name: data.room_name});
    let chatOL = roomDIV.querySelector('.chat-container')
    chatOL.append(genSystemMessage(`Пользователь ${data.user_name} добавлен.`))
})

roomListContainer.addEventListener('scroll', event => {
    // loading history when scrollbar hits top
    if (roomListContainer.scrollTop > roomListContainer.scrollHeight - 10 && activeRoomID >= 0) {
        requestHistory(activeRoomID)
    }
})
