"use strict";

module.exports = function(filename) {

const knex = require('knex')({
          client: 'sqlite3',
          connection: {
            filename: filename
          },
          useNullAsDefault: true
        });

function GetUserByPhone(tel) {
    return knex('user').where({tel}).first()
}

function AddUser(tel, name, pwd_hash) {
    return knex('user').insert({tel, name, pwd_hash})
}

function CreateRoom(name) {
    return knex('room').insert({name})
}

async function AddUserToRoom(user_id, room_id) {
    const user_rooms = await ReturnUserRooms(user_id);
    if (!user_rooms.includes(room_id)) {
        return knex('participant').insert({user_id, room_id})
    }
    return [];
}

function AddMessage(msg) {
    return knex('msg').insert(msg);
}

function ReturnMessageHistory(room_id, last_msg_id, chatHistoryLength = 10) {
    return knex('msg').select('*')
    .where({room_id}).where('id', '<', last_msg_id).orderBy('id', 'desc')
    .limit(chatHistoryLength)
}

function ReturnLastMessages(user_room_list) {
    // SELECT MAX(id) AS max, * FROM msg WHERE room_id in (<user_list>) GROUP BY room_id;
    return knex('msg').select('*').max('id as max').whereIn('room_id', user_room_list).groupBy('room_id')
}

function PluckedUsersInRoom(room_id) {
    return knex.from('participant')
     .where('room_id', '=', room_id).pluck('user_id')
}

async function ReturnUsersNotInRoom(room_id) {
    let users_in_room = await PluckedUsersInRoom(room_id);
    return knex.select('id', 'name').from('user')
       .whereNotIn('id', users_in_room)
}

function ReturnUserRooms(user_id) {
    return knex('participant').where('user_id', '=', user_id)
    .pluck('room_id')
}

function ReturnRoomsInfo(room_list) {
    return knex('room').whereIn('id', room_list)
}

function ReturnAllUsers() {
    return knex('user').select('id', 'name')
}

function ReturnRoomInfo(id) {   // room_id
    return knex('room').where({id}).first()
}

function ReturnMessageInfo(id) {
    return knex('msg').where({id}).first()
}

function ReturnUserInfo(id) {
    return knex('user').select('id', 'name').where({id}).first()
}

function ReturnUser(id) {
    return knex('user').where({id}).first()
}

function DeleteMessage(id) {
    return knex('msg')
    .where({id})
    .del()
}

    Promise.resolve()
      .then(() =>
        knex.schema.createTable('user', function (table) {
        table.increments('id');
        table.string('tel');
        table.string('name');
        table.string('pwd_hash');
        }))
      .then(() =>
      knex.schema.createTable('room', function (table) {
        table.increments('id');
        table.string('name');
     }))
      .then(() =>
      knex.schema.createTable('participant', function (table) {
        table.increments('id');
        table.integer('user_id');
        table.integer('room_id');
        table.foreign('user_id').references('user.id')
        table.foreign('room_id').references('room.id')
      }))
      .then(() =>
      knex.schema.createTable('msg', function (table) {
        table.increments('id');
        table.integer('type');
        table.string('value');
        table.integer('sender_id');
        table.integer('room_id');
        table.integer('timestamp');
        table.foreign('sender_id').references('user.id')
        table.foreign('room_id').references('room.id')
          }))
      .then(() => knex('room').insert({id: 0, name: "Общая комната"}))
      .then(() => console.log('DATABASE INITIALIZED'))
      .catch(()=> console.log('Assume tables exist, proceed.'))

    return {ReturnRoomsInfo, GetUserByPhone,
        AddUser,
        CreateRoom, AddUserToRoom,
        AddMessage, ReturnMessageHistory,
        ReturnLastMessages, ReturnUsersNotInRoom, ReturnAllUsers, ReturnUser,
        ReturnUserRooms, ReturnUserInfo, ReturnRoomInfo, ReturnRoomsInfo,
        ReturnMessageInfo, DeleteMessage,
        knex};
}
