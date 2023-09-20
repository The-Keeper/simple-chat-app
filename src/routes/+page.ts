import type { PageLoad } from './$types';
import { pb } from '$lib/pocketbase'
import type { ChatroomResponse } from '$lib/pocketbase-types';

export const load: PageLoad = async function ({ fetch }) {
    const chatrooms = await pb.collection("chatroom").getFullList<ChatroomResponse>();
    
    return { chatrooms }
};

