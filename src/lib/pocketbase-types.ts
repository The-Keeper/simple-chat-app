/**
* This file was @generated using pocketbase-typegen
*/

export enum Collections {
	Chatroom = "chatroom",
	Message = "message",
	Users = "users",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

// System fields
export type BaseSystemFields<T = never> = {
	id: RecordIdString
	created: IsoDateString
	updated: IsoDateString
	collectionId: string
	collectionName: Collections
	expand?: T
}

export type AuthSystemFields<T = never> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type ChatroomRecord = {
	participant: RecordIdString[]
}

export type MessageRecord = {
	author: RecordIdString
	chatroom: RecordIdString
	text?: string
}

export type UsersRecord = {
	avatar?: string
	name?: string
}

// Response types include system fields and match responses from the PocketBase API
export type ChatroomResponse<Texpand = unknown> = Required<ChatroomRecord> & BaseSystemFields<Texpand>
export type MessageResponse<Texpand = unknown> = Required<MessageRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	chatroom: ChatroomRecord
	message: MessageRecord
	users: UsersRecord
}

export type CollectionResponses = {
	chatroom: ChatroomResponse
	message: MessageResponse
	users: UsersResponse
}