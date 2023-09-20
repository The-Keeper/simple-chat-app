<script lang="ts">
	import type { PageData } from './$types';
  import { currentUser } from '$lib/stores/user'
  import { PUBLIC_POCKETBASE_URL } from '$env/static/public'


  export let data: PageData;
</script>

{#if !$currentUser}
    <div>You might want to finalize PocketBase installation using the <a target="_blank" rel="noopener noreferrer" href="{PUBLIC_POCKETBASE_URL + "/_/"}">Admin UI</a> </div>
{/if}

{#each data.chatrooms as c }
      <div>
        <div>{c.id}</div>
          <div>{c.participant.length} participant(s)</div>
      </div> 
{/each}