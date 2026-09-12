/* =========================================================
   SUPABASE
   ========================================================= */

const supabaseUrl =
    "https://shqhmidujqjplrfcfbno.supabase.co";

const supabaseKey = "sb_publishable_SrcktQ2vbRmIdcHHS0pUMQ_UQS600VK";

const client =
    window.supabase.createClient(
        supabaseUrl,
        supabaseKey
    );


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let currentUser = null;

let username = "";

let currentRoom = null;

let currentRoomData = null;

let selectedUsers = [];

let personalColor = "#5865F2";

const userColorCache = {};

let searchTimeout = null;

let roomInviteSearchTimeout = null;

let messagesPageSize = 10;

let oldestMessageTime = null;

let loadingOlderMessages = false;

let reachedBeginning = false;

let currentMessagesRequest = 0;


/* =========================================================
   THEME
   ========================================================= */

function loadTheme(){

    const savedTheme =
        localStorage.getItem(
            "school-chat-theme"
        );

    if(savedTheme === "light"){

        document.body.classList.add(
            "light-mode"
        );

    }else{

        document.body.classList.remove(
            "light-mode"
        );

    }

}


function toggleTheme(){

    document.body.classList.toggle(
        "light-mode"
    );

    const isLight =
        document.body.classList.contains(
            "light-mode"
        );

    localStorage.setItem(
        "school-chat-theme",
        isLight
            ? "light"
            : "dark"
    );

}


/* =========================================================
   FAVICON / TAB COVER
   ========================================================= */

const favicon =
    document.getElementById("favicon");

const coverPage =
    document.getElementById("cover-page");


document.addEventListener(
    "visibilitychange",
    () => {

        if(
            document.visibilityState ===
            "hidden"
        ){

            document.title = "Drive";

            favicon.href =
                "/faviconDRIVE.ico";

            coverPage.style.display =
                "flex";

        }else{

            document.title =
                "School Chat";

            favicon.href =
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYsxzg7eF-BYQYpc3x-D-hY3h3dgWNkpoDmHPjL9b_7g&s=10";

            coverPage.style.display =
                "none";

        }

    }
);


/* =========================================================
   ROOM MENU
   ========================================================= */

function toggleRoomMenu(event){

    event.stopPropagation();

    const menu =
        document.getElementById(
            "roomMenuDropdown"
        );

    menu.classList.toggle("show");

}


function closeRoomMenu(){

    const menu =
        document.getElementById(
            "roomMenuDropdown"
        );

    if(menu){

        menu.classList.remove(
            "show"
        );

    }

}


document.addEventListener(
    "click",
    () => {

        closeRoomMenu();

    }
);


/* =========================================================
   CATEGORY DROPDOWNS
   ========================================================= */

function toggleCategory(
    containerId,
    arrowId
){

    const container =
        document.getElementById(
            containerId
        );

    const arrow =
        document.getElementById(
            arrowId
        );

    container.classList.toggle(
        "show"
    );

    if(
        container.classList.contains(
            "show"
        )
    ){

        arrow.innerHTML =
            "&#9660;";

    }else{

        arrow.innerHTML =
            "&#9654;";

    }

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(text){

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text ?? "";

    return div.innerHTML;

}


/* =========================================================
   PERSONAL COLOR
   ========================================================= */

async function savePersonalColor(){

    if(!currentUser){

        return;

    }

    const picker =
        document.getElementById(
            "personalColorPicker"
        );

    const color =
        picker.value;

    if(!color){

        return;

    }

    const blob =
        new Blob(
            [
                JSON.stringify({
                    color:color
                })
            ],
            {
                type:"application/json"
            }
        );

    const colorPath =
        `${currentUser.id}/color.json`;


    const { error } =
        await client.storage
        .from("user-data")
        .upload(
            colorPath,
            blob,
            {
                contentType:
                    "application/json",
                upsert:true
            }
        );


    if(error){

        console.log(
            "Color upload error:",
            error
        );

        alert(
            "Couldn't save your color: " +
            error.message
        );

        return;

    }


    personalColor =
        color;


    document.getElementById(
        "personalColorText"
    ).innerText =
        color;


    applyPersonalColor();

    alert(
        "Color saved!"
    );

}


async function loadPersonalColor(){

    if(!currentUser){

        return;

    }

    const colorPath =
        `${currentUser.id}/color.json`;


    const {
        data,
        error
    } =
        await client.storage
        .from("user-data")
        .download(
            colorPath
        );


    if(error){

        personalColor =
            "#5865F2";

        applyPersonalColor();

        return;

    }


    try{

        const text =
            await data.text();

        const colorData =
            JSON.parse(text);


        if(
            colorData.color &&
            /^#[0-9A-F]{6}$/i.test(
                colorData.color
            )
        ){

            personalColor =
                colorData.color;

        }

    }catch(error){

        console.log(
            "Couldn't read color:",
            error
        );

        personalColor =
            "#5865F2";

    }


    const picker =
        document.getElementById(
            "personalColorPicker"
        );

    const colorText =
        document.getElementById(
            "personalColorText"
        );


    if(picker){

        picker.value =
            personalColor;

    }


    if(colorText){

        colorText.innerText =
            personalColor;

    }


    applyPersonalColor();

}


function applyPersonalColor(){

    const usernameDisplay =
        document.getElementById(
            "quickUsername"
        );

    if(usernameDisplay){

        usernameDisplay.style.color =
            personalColor ||
            "#5865F2";

    }

}


/* =========================================================
   PROFILE PICTURE
   ========================================================= */

async function uploadProfilePicture(){

    const fileInput =
        document.getElementById(
            "avatar-input"
        );

    const file =
        fileInput?.files?.[0];


    if(!file){

        alert(
            "Please select an image first!"
        );

        return;

    }


    const {
        data:{
            user
        },
        error:userError
    } =
        await client.auth.getUser();


    if(
        userError ||
        !user
    ){

        alert(
            "You must be logged in."
        );

        return;

    }


    const fileExt =
        file.name.includes(".")
            ? file.name.split(".").pop()
            : "png";


    const filePath =
        `${user.id}/avatar.${fileExt}`;


    const {
        error:uploadError
    } =
        await client.storage
        .from("avatars")
        .upload(
            filePath,
            file,
            {
                upsert:true
            }
        );


    if(uploadError){

        console.error(
            "Upload error:",
            uploadError
        );

        alert(
            "Failed to upload image."
        );

        return;

    }


    const {
        data
    } =
        client.storage
        .from("avatars")
        .getPublicUrl(
            filePath
        );


    const publicUrl =
        data?.publicUrl;


    if(!publicUrl){

        alert(
            "Failed to retrieve public URL."
        );

        return;

    }


    const {
        error:updateError
    } =
        await client
        .from("profiles")
        .update({
            avatar_url:
                publicUrl
        })
        .eq(
            "id",
            user.id
        );


    if(updateError){

        console.error(
            "Database update error:",
            updateError
        );

        alert(
            "Failed to save image link."
        );

        return;

    }


    currentUser.avatar_url =
        publicUrl;


    const cacheBust =
        `?t=${Date.now()}`;


    document.getElementById(
        "quickProfileAvatar"
    ).src =
        publicUrl +
        cacheBust;


    document.getElementById(
        "settingsAvatarPreview"
    ).src =
        publicUrl +
        cacheBust;


    userColorCache[
        currentUser.id
    ] = personalColor;


    if(currentRoom){

        await loadMessages();

    }


    alert(
        "Profile picture updated successfully!"
    );

}


/* =========================================================
   SETTINGS MODAL
   ========================================================= */

function toggleSettingsModal(){

    const modal =
        document.getElementById(
            "settingsModal"
        );


    if(
        modal.style.display ===
        "flex"
    ){

        modal.style.display =
            "none";

    }else{

        modal.style.display =
            "flex";

        document.getElementById(
            "settingsUsernameText"
        ).innerText =
            username;

        if(
            currentUser?.avatar_url
        ){

            document.getElementById(
                "settingsAvatarPreview"
            ).src =
                currentUser.avatar_url +
                `?t=${Date.now()}`;

        }

    }

}


/* =========================================================
   SIGN UP
   ========================================================= */

async function signUp(){

    const email =
        document
        .getElementById(
            "signupEmail"
        )
        .value
        .trim();


    const password =
        document
        .getElementById(
            "signupPassword"
        )
        .value;


    const usernameInput =
        document
        .getElementById(
            "signupUsername"
        )
        .value
        .trim();


    if(
        email === "" ||
        password === "" ||
        usernameInput === ""
    ){

        alert(
            "Fill out everything."
        );

        return;

    }


    const {
        data,
        error
    } =
        await client.auth.signUp({

            email,
            password

        });


    if(error){

        alert(
            error.message
        );

        return;

    }


    const user =
        data.user;


    if(!user){

        alert(
            "Account created, but no user was returned."
        );

        return;

    }


    const {
        error:profileError
    } =
        await client
        .from("profiles")
        .insert({

            id:user.id,

            username:
                usernameInput

        });


    if(profileError){

        alert(
            profileError.message
        );

        return;

    }


    alert(
        "Account created! Now log in."
    );

}


/* =========================================================
   LOGIN
   ========================================================= */

async function login(){

    const email =
        document
        .getElementById(
            "loginEmail"
        )
        .value
        .trim();


    const password =
        document
        .getElementById(
            "loginPassword"
        )
        .value;


    const {
        data,
        error
    } =
        await client.auth
        .signInWithPassword({

            email,
            password

        });


    if(error){

        alert(
            error.message
        );

        return;

    }


    currentUser =
        data.user;


    const {
        data:profile,
        error:profileError
    } =
        await client
        .from("profiles")
        .select("*")
        .eq(
            "id",
            currentUser.id
        )
        .single();


    if(profileError){

        alert(
            profileError.message
        );

        return;

    }


    username =
        profile.username;


    currentUser.avatar_url =
        profile.avatar_url;


    await startChat();

}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout(){

    await client.auth.signOut();

    location.reload();

}


/* =========================================================
   START CHAT
   ========================================================= */

async function startChat(){

    document.getElementById(
        "login"
    ).style.display =
        "none";


    document.getElementById(
        "chatArea"
    ).style.display =
        "flex";


    const quickUsername =
    document.getElementById("quickUsername");

if(quickUsername){
    quickUsername.innerText = username;
}


    document.getElementById(
        "settingsUsernameText"
    ).innerText =
        username;


    if(currentUser?.avatar_url){

        const avatarUrl =
            currentUser.avatar_url +
            `?t=${Date.now()}`;


        const quickAvatar =
    document.getElementById("quickProfileAvatar");

if(quickAvatar){
    quickAvatar.src = avatarUrl;
}


        document.getElementById(
            "settingsAvatarPreview"
        ).src =
            avatarUrl;

    }


    await loadPersonalColor();

    await loadRooms();

}


/* =========================================================
   LOAD ROOMS
   ========================================================= */

async function loadRooms(){

    if(!currentUser){

        return;

    }


    const {
        data,
        error
    } =
        await client
        .from("room_members")
        .select(`
            rooms (
                id,
                name,
                private,
                allow_invites,
                owner_id
            )
        `)
        .eq(
            "user_id",
            currentUser.id
        );


    if(error){

        console.log(
            "Room loading error:",
            error
        );

        return;

    }


    const list =
        document.getElementById(
            "roomList"
        );


    list.innerHTML = "";


    if(!data || data.length === 0){

        list.innerHTML = `
            <div
                style="
                    color:var(--text-muted);
                    padding:10px;
                    font-size:13px;
                "
            >
                You aren't in any rooms yet.
            </div>
        `;

        return;

    }


    data.forEach(
        member => {

            const room =
                member.rooms;


            if(!room){

                return;

            }


            const button =
                document.createElement(
                    "button"
                );


            button.innerHTML = `

                ${
                    room.private
                        ? "🔒"
                        : "#"
                }

                ${escapeHTML(
                    room.name
                )}

            `;


            button.onclick =
                () =>
                    openRoom(
                        room.id,
                        room.name
                    );


            list.appendChild(
                button
            );

        }
    );

}


/* =========================================================
   CREATE ROOM
   ========================================================= */

function openRoomCreator(){

    selectedUsers = [];


    document.getElementById(
        "roomName"
    ).value = "";


    document.getElementById(
        "createRoomInviteSearch"
    ).value = "";


    document.getElementById(
        "userSearchResults"
    ).innerHTML = "";


    renderSelectedUsers();


    document.getElementById(
        "createRoomBox"
    ).style.display =
        "flex";

}


function closeRoomCreator(){

    document.getElementById(
        "createRoomBox"
    ).style.display =
        "none";


    selectedUsers = [];


    renderSelectedUsers();

}


/* =========================================================
   SEARCH USERS FOR ROOM CREATION
   ========================================================= */

async function searchCreateRoomUsers(){

    clearTimeout(
        searchTimeout
    );


    searchTimeout =
        setTimeout(
            async () => {

                const search =
                    document
                    .getElementById(
                        "createRoomInviteSearch"
                    )
                    .value
                    .trim();


                const results =
                    document.getElementById(
                        "userSearchResults"
                    );


                if(search === ""){

                    results.innerHTML =
                        "";

                    return;

                }


                const {
                    data,
                    error
                } =
                    await client
                    .from("profiles")
                    .select(
                        "id, username"
                    )
                    .ilike(
                        "username",
                        `%${search}%`
                    )
                    .neq(
                        "id",
                        currentUser.id
                    )
                    .limit(10);


                if(error){

                    console.log(error);

                    results.innerHTML =
                        "<p>Couldn't search users.</p>";

                    return;

                }


                results.innerHTML =
                    "";


                if(!data.length){

                    results.innerHTML = `
                        <p
                            style="
                                color:var(--text-muted);
                            "
                        >
                            No users found.
                        </p>
                    `;

                    return;

                }


                data.forEach(
                    user => {

                        if(
                            selectedUsers.some(
                                u =>
                                    u.id ===
                                    user.id
                            )
                        ){

                            return;

                        }


                        const div =
                            document.createElement(
                                "div"
                            );


                        div.style.display =
                            "flex";

                        div.style.alignItems =
                            "center";

                        div.style.justifyContent =
                            "space-between";

                        div.style.padding =
                            "8px";

                        div.style.background =
                            "var(--border)";

                        div.style.marginBottom =
                            "5px";

                        div.style.borderRadius =
                            "5px";


                        const name =
                            document.createElement(
                                "span"
                            );

                        name.innerText =
                            user.username;


                        const button =
                            document.createElement(
                                "button"
                            );

                        button.innerText =
                            "+";


                        button.style.padding =
                            "6px 10px";

                        button.style.margin =
                            "0";


                        button.onclick =
                            () =>
                                selectUser(
                                    user.id,
                                    user.username
                                );


                        div.appendChild(
                            name
                        );

                        div.appendChild(
                            button
                        );


                        results.appendChild(
                            div
                        );

                    }
                );

            },
            150
        );

}


/* =========================================================
   SELECT USER
   ========================================================= */

function selectUser(
    id,
    username
){

    if(
        selectedUsers.some(
            user =>
                user.id === id
        )
    ){

        return;

    }


    selectedUsers.push({

        id,
        username

    });


    renderSelectedUsers();


    document.getElementById(
        "createRoomInviteSearch"
    ).value =
        "";


    document.getElementById(
        "userSearchResults"
    ).innerHTML =
        "";

}


/* =========================================================
   RENDER SELECTED USERS
   ========================================================= */

function renderSelectedUsers(){

    const container =
        document.getElementById(
            "selectedUsers"
        );


    const title =
        document.getElementById(
            "selectedUsersTitle"
        );


    const visibility =
        document.getElementById(
            "roomVisibility"
        );


    container.innerHTML =
        "";


    if(
        selectedUsers.length ===
        0
    ){

        title.style.display =
            "none";

        visibility.style.display =
            "none";

        return;

    }


    title.style.display =
        "block";


    visibility.style.display =
        "block";


    selectedUsers.forEach(
        user => {

            const div =
                document.createElement(
                    "div"
                );


            div.style.display =
                "flex";

            div.style.alignItems =
                "center";

            div.style.justifyContent =
                "space-between";

            div.style.padding =
                "8px";


            const span =
                document.createElement(
                    "span"
                );

            span.innerText =
                `👤 ${user.username}`;


            const button =
                document.createElement(
                    "button"
                );

            button.innerText =
                "×";


            button.style.padding =
                "5px 8px";

            button.style.background =
                "var(--danger)";

            button.style.margin =
                "0";


            button.onclick =
                () =>
                    removeSelectedUser(
                        user.id
                    );


            div.appendChild(
                span
            );

            div.appendChild(
                button
            );


            container.appendChild(
                div
            );

        }
    );

}


/* =========================================================
   REMOVE SELECTED USER
   ========================================================= */

function removeSelectedUser(id){

    selectedUsers =
        selectedUsers.filter(
            user =>
                user.id !== id
        );


    renderSelectedUsers();

}


/* =========================================================
   SUBMIT ROOM
   ========================================================= */

async function submitRoom(){

    const name =
        document
        .getElementById(
            "roomName"
        )
        .value
        .trim();


    if(name === ""){

        alert(
            "Enter a room name."
        );

        return;

    }


    let privateValue =
        false;


    if(
        selectedUsers.length >
        0
    ){

        const selectedType =
            document.querySelector(
                'input[name="roomType"]:checked'
            );


        if(selectedType){

            privateValue =
                selectedType.value ===
                "true";

        }

    }


    const {
        data,
        error
    } =
        await client
        .from("rooms")
        .insert({

            name,

            private:
                privateValue,

            owner_id:
                currentUser.id

        })
        .select()
        .single();


    if(error){

        console.log(error);

        alert(
            error.message
        );

        return;

    }


    const {
        error:memberError
    } =
        await client
        .from("room_members")
        .insert({

            room_id:
                data.id,

            user_id:
                currentUser.id

        });


    if(memberError){

        console.log(
            memberError
        );

        alert(
            "Room created, but couldn't add you."
        );

        return;

    }


    for(
        const user
        of selectedUsers
    ){

        const {
            error:inviteError
        } =
            await client
            .from("room_invites")
            .insert({

                room_id:
                    data.id,

                inviter_id:
                    currentUser.id,

                invitee_id:
                    user.id,

                status:
                    "pending"

            });


        if(inviteError){

            console.log(
                "Invite error:",
                inviteError
            );

        }

    }


    selectedUsers = [];


    closeRoomCreator();


    await loadRooms();


    await openRoom(
        data.id,
        data.name
    );

}


/* =========================================================
   OPEN ROOM
   ========================================================= */

async function openRoom(
    roomID,
    roomName
){

    currentRoom =
        roomID;


    currentRoomData =
        null;


    document.getElementById(
        "roomTitle"
    ).innerText =
        "# " + roomName;


    const {
        data,
        error
    } =
        await client
        .from("rooms")
        .select(`
            id,
            name,
            private,
            allow_invites,
            owner_id
        `)
        .eq(
            "id",
            roomID
        )
        .single();


    if(error){

        console.log(
            error
        );

        return;

    }


    currentRoomData =
        data;


    updateRoomButtons();


    await loadMessages();

}


/* =========================================================
   ROOM BUTTON PERMISSIONS
   ========================================================= */

function updateRoomButtons(){

    const inviteButton =
        document.getElementById(
            "inviteUsersButton"
        );


    const settingsButton =
        document.getElementById(
            "roomSettingsButton"
        );


    if(!currentRoomData){

        inviteButton.style.display =
            "none";

        settingsButton.style.display =
            "none";

        closeRoomMenu();

        return;

    }


    settingsButton.style.display =
        "block";


    const isOwner =
        currentRoomData.owner_id ===
        currentUser.id;


    const canInvite =
        currentRoomData.allow_invites ||
        isOwner;


    inviteButton.style.display =
        canInvite
            ? "block"
            : "none";

}


/* =========================================================
   ROOM INVITE SEARCH
   ========================================================= */

async function searchRoomInviteUsers(){

    clearTimeout(
        roomInviteSearchTimeout
    );


    roomInviteSearchTimeout =
        setTimeout(
            async () => {

                const search =
                    document
                    .getElementById(
                        "roomInviteSearch"
                    )
                    .value
                    .trim();


                const results =
                    document.getElementById(
                        "roomInviteResults"
                    );


                if(search === ""){

                    results.innerHTML =
                        "";

                    return;

                }


                const {
                    data,
                    error
                } =
                    await client
                    .from("profiles")
                    .select(
                        "id, username"
                    )
                    .ilike(
                        "username",
                        `%${search}%`
                    )
                    .neq(
                        "id",
                        currentUser.id
                    )
                    .limit(10);


                if(error){

                    console.log(
                        error
                    );

                    return;

                }


                results.innerHTML =
                    "";


                for(
                    const user
                    of data
                ){

                    const {
                        data:existingMember
                    } =
                        await client
                        .from("room_members")
                        .select(
                            "user_id"
                        )
                        .eq(
                            "room_id",
                            currentRoom
                        )
                        .eq(
                            "user_id",
                            user.id
                        )
                        .maybeSingle();


                    if(existingMember){

                        continue;

                    }


                    const div =
                        document.createElement(
                            "div"
                        );


                    div.style.display =
                        "flex";

                    div.style.alignItems =
                        "center";

                    div.style.justifyContent =
                        "space-between";

                    div.style.padding =
                        "8px";

                    div.style.background =
                        "var(--border)";

                    div.style.marginBottom =
                        "5px";

                    div.style.borderRadius =
                        "5px";


                    const span =
                        document.createElement(
                            "span"
                        );

                    span.innerText =
                        user.username;


                    const button =
                        document.createElement(
                            "button"
                        );

                    button.innerText =
                        "+";

                    button.style.padding =
                        "6px 10px";

                    button.style.margin =
                        "0";


                    button.onclick =
                        () =>
                            inviteUserToCurrentRoom(
                                user.id
                            );


                    div.appendChild(
                        span
                    );

                    div.appendChild(
                        button
                    );


                    results.appendChild(
                        div
                    );

                }

            },
            250
        );

}


/* =========================================================
   INVITE USER TO CURRENT ROOM
   ========================================================= */

async function inviteUserToCurrentRoom(
    userID
){

    if(!currentRoomData){

        return;

    }


    const isOwner =
        currentRoomData.owner_id ===
        currentUser.id;


    const canInvite =
        currentRoomData.allow_invites ||
        isOwner;


    if(!canInvite){

        alert(
            "Only the room owner can invite people."
        );

        return;

    }


    const {
        data:member
    } =
        await client
        .from("room_members")
        .select("user_id")
        .eq(
            "room_id",
            currentRoom
        )
        .eq(
            "user_id",
            userID
        )
        .maybeSingle();


    if(member){

        alert(
            "That user is already in this room."
        );

        return;

    }


    const {
        data:existingInvite
    } =
        await client
        .from("room_invites")
        .select(
            "id, status"
        )
        .eq(
            "room_id",
            currentRoom
        )
        .eq(
            "invitee_id",
            userID
        )
        .maybeSingle();


    if(existingInvite){

        if(
            existingInvite.status ===
            "pending"
        ){

            alert(
                "That user already has an invite."
            );

            return;

        }


        const {
            error
        } =
            await client
            .from("room_invites")
            .update({

                inviter_id:
                    currentUser.id,

                status:
                    "pending"

            })
            .eq(
                "id",
                existingInvite.id
            );


        if(error){

            alert(
                error.message
            );

            return;

        }

    }else{

        const {
            error
        } =
            await client
            .from("room_invites")
            .insert({

                room_id:
                    currentRoom,

                inviter_id:
                    currentUser.id,

                invitee_id:
                    userID,

                status:
                    "pending"

            });


        if(error){

            console.log(
                error
            );

            alert(
                error.message
            );

            return;

        }

    }


    alert(
        "Invitation sent!"
    );

}


/* =========================================================
   ROOM INVITE MODAL
   ========================================================= */

function openRoomInviteModal(){

    if(!currentRoomData){

        return;

    }


    const isOwner =
        currentRoomData.owner_id ===
        currentUser.id;


    const canInvite =
        currentRoomData.allow_invites ||
        isOwner;


    if(!canInvite){

        alert(
            "Only the room owner can invite people."
        );

        return;

    }


    document.getElementById(
        "roomInviteModal"
    ).style.display =
        "flex";


    document.getElementById(
        "roomInviteSearch"
    ).value =
        "";


    document.getElementById(
        "roomInviteResults"
    ).innerHTML =
        "";

}


function closeRoomInviteModal(){

    document.getElementById(
        "roomInviteModal"
    ).style.display =
        "none";

}


function openRoomInviteFromMenu(){

    closeRoomMenu();

    openRoomInviteModal();

}


/* =========================================================
   ROOM SETTINGS
   ========================================================= */

function openRoomSettings(){

    if(!currentRoomData){

        return;

    }


    document.getElementById(
        "roomSettingsModal"
    ).style.display =
        "flex";


    const isOwner =
        currentRoomData.owner_id ===
        currentUser.id;


    const ownerSettings =
        document.getElementById(
            "ownerRoomSettings"
        );


    if(isOwner){

        ownerSettings.style.display =
            "block";


        document.getElementById(
            "settingsRoomName"
        ).value =
            currentRoomData.name;


        const roomType =
            document.querySelector(
                `input[name="settingsRoomType"][value="${currentRoomData.private}"]`
            );


        if(roomType){

            roomType.checked =
                true;

        }


        const invitePermission =
            document.querySelector(
                `input[name="settingsInvitePermission"][value="${currentRoomData.allow_invites}"]`
            );


        if(invitePermission){

            invitePermission.checked =
                true;

        }

    }else{

        ownerSettings.style.display =
            "none";

    }

}


function openRoomSettingsFromMenu(){

    closeRoomMenu();

    openRoomSettings();

}


function closeRoomSettings(){

    document.getElementById(
        "roomSettingsModal"
    ).style.display =
        "none";

}


/* =========================================================
   SAVE ROOM SETTINGS
   ========================================================= */

async function saveRoomSettings(){

    if(!currentRoomData){

        return;

    }


    if(
        currentRoomData.owner_id !==
        currentUser.id
    ){

        alert(
            "Only the room owner can change settings."
        );

        return;

    }


    const name =
        document
        .getElementById(
            "settingsRoomName"
        )
        .value
        .trim();


    if(name === ""){

        alert(
            "Room name cannot be empty."
        );

        return;

    }


    const roomType =
        document.querySelector(
            'input[name="settingsRoomType"]:checked'
        );


    const invitePermission =
        document.querySelector(
            'input[name="settingsInvitePermission"]:checked'
        );


    const privateValue =
        roomType?.value ===
        "true";


    const allowInvites =
        invitePermission?.value ===
        "true";


    const {
        data,
        error
    } =
        await client
        .from("rooms")
        .update({

            name,

            private:
                privateValue,

            allow_invites:
                allowInvites

        })
        .eq(
            "id",
            currentRoom
        )
        .eq(
            "owner_id",
            currentUser.id
        )
        .select()
        .single();


    if(error){

        console.log(
            error
        );

        alert(
            error.message
        );

        return;

    }


    currentRoomData =
        data;


    document.getElementById(
        "roomTitle"
    ).innerText =
        "# " + data.name;


    updateRoomButtons();


    await loadRooms();


    closeRoomSettings();

}


/* =========================================================
   LEAVE ROOM
   ========================================================= */

async function leaveCurrentRoom(){

    if(!currentRoomData){

        return;

    }


    if(
        currentRoomData.owner_id ===
        currentUser.id
    ){

        alert(
            "The room owner cannot leave the room."
        );

        return;

    }


    const confirmed =
        confirm(
            `Leave "${currentRoomData.name}"?`
        );


    if(!confirmed){

        return;

    }


    const {
        error
    } =
        await client
        .from("room_members")
        .delete()
        .eq(
            "room_id",
            currentRoom
        )
        .eq(
            "user_id",
            currentUser.id
        );


    if(error){

        console.log(
            error
        );

        alert(
            error.message
        );

        return;

    }


    currentRoom =
        null;


    currentRoomData =
        null;


    document.getElementById(
        "roomTitle"
    ).innerText =
        "Select a room";


    document.getElementById(
        "messages"
    ).innerHTML =
        "";


    updateRoomButtons();


    closeRoomSettings();


    await loadRooms();

}


/* =========================================================
   INVITES
   ========================================================= */

async function openInvites(){

    document.getElementById(
        "invitesModal"
    ).style.display =
        "flex";


    await loadInvites();

}


function closeInvites(){

    document.getElementById(
        "invitesModal"
    ).style.display =
        "none";

}


async function loadInvites(){

    const {
        data,
        error
    } =
        await client
        .from("room_invites")
        .select(`
            id,
            room_id,
            inviter_id,
            status,
            created_at,
            rooms (
                name
            ),
            profiles!room_invites_inviter_id_fkey (
                username
            )
        `)
        .eq(
            "invitee_id",
            currentUser.id
        )
        .eq(
            "status",
            "pending"
        )
        .order(
            "created_at",
            {
                ascending:false
            }
        );


    if(error){

        console.log(
            error
        );

        return;

    }


    const list =
        document.getElementById(
            "inviteList"
        );


    list.innerHTML =
        "";


    if(!data.length){

        list.innerHTML = `
            <p
                style="
                    color:var(--text-muted);
                "
            >
                You have no pending invites.
            </p>
        `;

        return;

    }


    data.forEach(
        invite => {

            const div =
                document.createElement(
                    "div"
                );


            div.style.background =
                "var(--border)";

            div.style.padding =
                "12px";

            div.style.marginBottom =
                "10px";

            div.style.borderRadius =
                "6px";


            const roomName =
                invite.rooms?.name ||
                "Unknown Room";


            const inviterName =
                invite.profiles?.username ||
                "Unknown User";


            div.innerHTML = `

                <strong>
                    ${escapeHTML(
                        roomName
                    )}
                </strong>

                <p
                    style="
                        color:var(--text-secondary);
                    "
                >
                    Invited by
                    <strong>
                        ${escapeHTML(
                            inviterName
                        )}
                    </strong>
                </p>

                <button
                    onclick="
                        acceptInvite(
                            '${invite.id}'
                        )
                    "
                >
                    Accept
                </button>

                <button
                    onclick="
                        declineInvite(
                            '${invite.id}'
                        )
                    "
                    style="
                        background:var(--danger);
                    "
                >
                    Decline
                </button>

            `;


            list.appendChild(
                div
            );

        }
    );

}


/* =========================================================
   ACCEPT INVITE
   ========================================================= */

async function acceptInvite(
    inviteID
){

    const {
        data:invite,
        error:inviteError
    } =
        await client
        .from("room_invites")
        .select("*")
        .eq(
            "id",
            inviteID
        )
        .eq(
            "invitee_id",
            currentUser.id
        )
        .eq(
            "status",
            "pending"
        )
        .single();


    if(inviteError){

        alert(
            "This invitation is no longer available."
        );

        await loadInvites();

        return;

    }


    const {
        error:memberError
    } =
        await client
        .from("room_members")
        .insert({

            room_id:
                invite.room_id,

            user_id:
                currentUser.id

        });


    if(memberError){

        console.log(
            memberError
        );

        alert(
            memberError.message
        );

        return;

    }


    const {
        error:updateError
    } =
        await client
        .from("room_invites")
        .update({

            status:
                "accepted"

        })
        .eq(
            "id",
            inviteID
        )
        .eq(
            "invitee_id",
            currentUser.id
        );


    if(updateError){

        console.log(
            updateError
        );

        return;

    }


    await loadRooms();

    await loadInvites();

}


/* =========================================================
   DECLINE INVITE
   ========================================================= */

async function declineInvite(
    inviteID
){

    const {
        error
    } =
        await client
        .from("room_invites")
        .update({

            status:
                "declined"

        })
        .eq(
            "id",
            inviteID
        )
        .eq(
            "invitee_id",
            currentUser.id
        )
        .eq(
            "status",
            "pending"
        );


    if(error){

        console.log(
            error
        );

        alert(
            error.message
        );

        return;

    }


    await loadInvites();

}


/* =========================================================
   LOAD USER COLOR
   ========================================================= */

async function getUserColor(
    userID
){

    if(
        userColorCache[userID]
    ){

        return userColorCache[
            userID
        ];

    }


    const colorPath =
        `${userID}/color.json`;


    const {
        data,
        error
    } =
        await client.storage
        .from("user-data")
        .download(
            colorPath
        );


    if(error){

        userColorCache[
            userID
        ] =
            "#00B0F4";

        return "#00B0F4";

    }


    try{

        const text =
            await data.text();


        const colorData =
            JSON.parse(
                text
            );


        if(
            colorData.color &&
            /^#[0-9A-F]{6}$/i.test(
                colorData.color
            )
        ){

            userColorCache[
                userID
            ] =
                colorData.color;


            return colorData.color;

        }

    }catch(error){

        console.log(
            "Color read error:",
            error
        );

    }


    userColorCache[
        userID
    ] =
        "#00B0F4";


    return "#00B0F4";

}


/* =========================================================
   SEND MESSAGE

   IMPORTANT:
   We do NOT call loadMessages() here.

   Realtime will add the message once.
   This prevents the duplicate-message bug.
   ========================================================= */

async function sendMessage(){

    const input =
        document.getElementById(
            "message"
        );


    const text =
        input.value.trim();


    if(text === ""){

        return;

    }


    if(currentRoom === null){

        alert(
            "Select a room first!"
        );

        return;

    }


    const {
        error
    } =
        await client
        .from("messages")
        .insert([{

            user_id:
                currentUser.id,

            room_id:
                currentRoom,

            message:
                text

        }]);


    if(error){

        alert(
            error.message
        );

        console.log(
            error
        );

        return;

    }


    input.value =
        "";

}


/* =========================================================
   LOAD MESSAGES
   ========================================================= */

async function loadMessages(){

    if(!currentRoom){

        return;

    }


    const requestID =
        ++currentMessagesRequest;


    loadingOlderMessages =
        false;

    reachedBeginning =
        false;

    oldestMessageTime =
        null;


    const box =
        document.getElementById(
            "messages"
        );


    box.innerHTML = `
        <div
            style="
                text-align:center;
                color:var(--text-muted);
                padding:20px;
            "
        >
            Loading messages...
        </div>
    `;


    const {
        data,
        error
    } =
        await client
        .from("messages")
        .select(`
            id,
            user_id,
            room_id,
            message,
            created_at,
            profiles(
                username,
                avatar_url
            )
        `)
        .eq(
            "room_id",
            currentRoom
        )
        .order(
            "created_at",
            {
                ascending:false
            }
        )
        .limit(
            messagesPageSize
        );


    if(
        requestID !==
        currentMessagesRequest
    ){

        return;

    }


    if(error){

        console.log(
            error
        );

        box.innerHTML = `
            <p
                style="
                    color:var(--danger);
                "
            >
                Couldn't load messages.
            </p>
        `;

        return;

    }


    if(
        data.length <
        messagesPageSize
    ){

        reachedBeginning =
            true;

    }


    if(data.length > 0){

        oldestMessageTime =
            data[
                data.length - 1
            ].created_at;

    }


    data.reverse();


    box.innerHTML =
        "";


    await renderMessages(
        data
    );


    box.scrollTop =
        box.scrollHeight;

}


/* =========================================================
   RENDER MESSAGES
   ========================================================= */

async function renderMessages(
    data
){

    const box =
        document.getElementById(
            "messages"
        );


    const defaultAvatar =
        "https://gravatar.com";


    const colorCache =
        {};


    for(
        const msg
        of data
    ){

        if(
            !colorCache[
                msg.user_id
            ]
        ){

            colorCache[
                msg.user_id
            ] =
                await getUserColor(
                    msg.user_id
                );

        }

    }


    for(
        const msg
        of data
    ){

        const element =
            createMessageElement(
                msg,
                colorCache[
                    msg.user_id
                ] ||
                "#00B0F4"
            );


        box.appendChild(
            element
        );

    }

}


/* =========================================================
   CREATE MESSAGE ELEMENT
   ========================================================= */

function createMessageElement(
    msg,
    usernameColor
){

    const defaultAvatar =
        "https://gravatar.com";


    let pfpUrl =
        msg.profiles?.avatar_url ||
        defaultAvatar;


    if(
        msg.profiles?.avatar_url
    ){

        pfpUrl =
            msg.profiles.avatar_url +
            `?t=${Date.now()}`;

    }


    const messageElement =
        document.createElement(
            "div"
        );


    messageElement.className =
        "message";


    messageElement.dataset.messageId =
        msg.id;


    const avatar =
        document.createElement(
            "img"
        );


    avatar.className =
        "avatar";


    avatar.src =
        pfpUrl;


    avatar.alt =
        "PFP";


    const content =
        document.createElement(
            "div"
        );


    content.className =
        "message-content";


    const name =
        document.createElement(
            "div"
        );


    name.className =
        "username";


    name.style.color =
        usernameColor;


    name.innerText =
        msg.profiles?.username ||
        "Unknown User";


    const text =
        document.createElement(
            "div"
        );


    text.innerText =
        msg.message;


    content.appendChild(
        name
    );

    content.appendChild(
        text
    );


    messageElement.appendChild(
        avatar
    );

    messageElement.appendChild(
        content
    );


    return messageElement;

}


/* =========================================================
   LOAD OLDER MESSAGES
   ========================================================= */

async function loadOlderMessages(){

    if(
        loadingOlderMessages ||
        reachedBeginning ||
        !oldestMessageTime ||
        !currentRoom
    ){

        return;

    }


    loadingOlderMessages =
        true;


    const box =
        document.getElementById(
            "messages"
        );


    const oldScrollHeight =
        box.scrollHeight;


    const oldScrollTop =
        box.scrollTop;


    const roomAtRequest =
        currentRoom;


    const {
        data,
        error
    } =
        await client
        .from("messages")
        .select(`
            id,
            user_id,
            room_id,
            message,
            created_at,
            profiles(
                username,
                avatar_url
            )
        `)
        .eq(
            "room_id",
            roomAtRequest
        )
        .lt(
            "created_at",
            oldestMessageTime
        )
        .order(
            "created_at",
            {
                ascending:false
            }
        )
        .limit(
            messagesPageSize
        );


    if(
        roomAtRequest !==
        currentRoom
    ){

        loadingOlderMessages =
            false;

        return;

    }


    if(error){

        console.log(
            "Error loading older messages:",
            error
        );

        loadingOlderMessages =
            false;

        return;

    }


    if(
        data.length <
        messagesPageSize
    ){

        reachedBeginning =
            true;

    }


    if(data.length === 0){

        reachedBeginning =
            true;

        loadingOlderMessages =
            false;

        return;

    }


    oldestMessageTime =
        data[
            data.length - 1
        ].created_at;


    data.reverse();


    const fragment =
        document.createDocumentFragment();


    const colorCache =
        {};


    for(
        const msg
        of data
    ){

        if(
            !colorCache[
                msg.user_id
            ]
        ){

            colorCache[
                msg.user_id
            ] =
                await getUserColor(
                    msg.user_id
                );

        }


        fragment.appendChild(
            createMessageElement(
                msg,
                colorCache[
                    msg.user_id
                ] ||
                "#00B0F4"
            )
        );

    }


    box.insertBefore(
        fragment,
        box.firstChild
    );


    const newScrollHeight =
        box.scrollHeight;


    box.scrollTop =
        oldScrollTop +
        (
            newScrollHeight -
            oldScrollHeight
        );


    loadingOlderMessages =
        false;

}


/* =========================================================
   MESSAGE SCROLL
   ========================================================= */

document
.getElementById(
    "messages"
)
.addEventListener(
    "scroll",
    function(){

        if(
            this.scrollTop <= 100
        ){

            loadOlderMessages();

        }

    }
);


/* =========================================================
   REALTIME MESSAGES

   IMPORTANT:

   This is the ONLY thing that adds a newly
   sent message to the screen.

   sendMessage() no longer calls loadMessages().
   ========================================================= */

client
.channel("messages")
.on(
    "postgres_changes",
    {

        event:
            "INSERT",

        schema:
            "public",

        table:
            "messages"

    },
    async function(payload){

        const newMessage =
            payload.new;


        if(
            currentRoom === null ||
            newMessage.room_id !==
            currentRoom
        ){

            return;

        }


        const box =
            document.getElementById(
                "messages"
            );


        /*
           Prevent duplicate rendering.

           If this ID already exists in
           the DOM, don't add it again.
        */

        if(
            box.querySelector(
                `[data-message-id="${newMessage.id}"]`
            )
        ){

            return;

        }


        const {
            data,
            error
        } =
            await client
            .from("messages")
            .select(`
                id,
                user_id,
                room_id,
                message,
                created_at,
                profiles(
                    username,
                    avatar_url
                )
            `)
            .eq(
                "id",
                newMessage.id
            )
            .single();


        if(error){

            console.log(
                "Couldn't load new message:",
                error
            );

            return;

        }


        if(
            currentRoom !==
            data.room_id
        ){

            return;

        }


        const usernameColor =
            await getUserColor(
                data.user_id
            );


        const messageElement =
            createMessageElement(
                data,
                usernameColor
            );


        /*
           Check AGAIN because the async
           database query could have taken
           long enough for another render.
        */

        if(
            box.querySelector(
                `[data-message-id="${data.id}"]`
            )
        ){

            return;

        }


        const distanceFromBottom =
            box.scrollHeight -
            box.scrollTop -
            box.clientHeight;


        box.appendChild(
            messageElement
        );


        if(
            distanceFromBottom <
            150
        ){

            box.scrollTop =
                box.scrollHeight;

        }

    }
)
.subscribe();


/* =========================================================
   PERSONAL COLOR PICKER
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const picker =
            document.getElementById(
                "personalColorPicker"
            );


        if(picker){

            picker.addEventListener(
                "input",
                () => {

                    document.getElementById(
                        "personalColorText"
                    ).innerText =
                        picker.value;

                }
            );

        }

    }
);


/* =========================================================
   SEARCH ROOMS
   ========================================================= */

document
.getElementById(
    "searchRooms"
)
.addEventListener(
    "input",
    function(){

        const search =
            this.value
            .trim()
            .toLowerCase();


        document
        .querySelectorAll(
            "#roomList button"
        )
        .forEach(
            button => {

                button.style.display =
                    button.innerText
                    .toLowerCase()
                    .includes(search)
                        ? ""
                        : "none";

            }
        );

    }
);


/* =========================================================
   CHECK SESSION
   ========================================================= */

async function checkSession(){

    const {
        data
    } =
        await client.auth.getSession();


    if(
        data.session
    ){

        currentUser =
            data.session.user;


        const {
            data:profile,
            error
        } =
            await client
            .from("profiles")
            .select("*")
            .eq(
                "id",
                currentUser.id
            )
            .single();


        if(error){

            console.log(
                error
            );

            return;

        }


        username =
            profile.username;


        currentUser.avatar_url =
            profile.avatar_url;


        await startChat();

    }

}


/* =========================================================
   INITIALIZE
   ========================================================= */

loadTheme();

checkSession();
