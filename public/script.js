const socket = io();

socket.on("connect", () => {
    document.getElementById("myId").innerText = socket.id;
});

document.getElementById("sendBtn").addEventListener("click", () => {
    const receiverId = document.getElementById("receiverId").value;
    const message = document.getElementById("message").value;
    
    if (receiverId && message) {
        socket.emit("private_message", { receiverId, message });
    }
});

socket.on("receive_message", ({ senderId, message }) => {
    const messagesList = document.getElementById("messages");
    const listItem = document.createElement("li");
    listItem.textContent = `From ${senderId}: ${message}`;
    messagesList.appendChild(listItem);
});
