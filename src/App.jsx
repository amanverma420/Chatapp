import React, { useEffect, useRef, useState } from "react";
import { ZIM } from "zego-zim-web";
import bg from './assets/bg.jpg';

function App() {
  const [zimInstance, setZimInstance] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState("Aman");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isZimReady, setIsZimReady] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState("");

  const messageEndRef = useRef(null);
  const zimRef = useRef(null);

  // Add debug logging for environment variables
  const appID = import.meta.env.VITE_ZIM_APP_ID;
  const tokenA = import.meta.env.VITE_TOKEN_AMAN;
  const tokenB = import.meta.env.VITE_TOKEN_AMIT;

  // Debug environment variables
  useEffect(() => {
    console.log("Environment variables check:");
    console.log("VITE_ZIM_APP_ID:", appID ? "✓ Present" : " Missing");
    console.log("VITE_TOKEN_AMAN:", tokenA ? "✓ Present" : " Missing");
    console.log("VITE_TOKEN_AMIT:", tokenB ? "✓ Present" : " Missing");
    
    if (!appID) {
      setError("VITE_ZIM_APP_ID is missing from environment variables");
      setDebugInfo("Check your .env file for VITE_ZIM_APP_ID");
      return;
    }
    if (!tokenA || !tokenB) {
      setError("One or both tokens are missing from environment variables");
      setDebugInfo("Check your .env file for VITE_TOKEN_AMAN and VITE_TOKEN_AMIT");
      return;
    }
  }, [appID, tokenA, tokenB]);

  useEffect(() => {
    // Don't initialize if we have environment variable errors
    if (error) return;
    
    let isMounted = true;

    const initZim = async () => {
      try {
        console.log("Initializing ZIM with appID:", appID);
        setDebugInfo("Creating ZIM instance...");
        
        // Add validation for appID format (should be a number)
        const numericAppID = parseInt(appID);
        if (isNaN(numericAppID)) {
          throw new Error("App ID must be a valid number");
        }
        
        const instance = ZIM.create({ appID: numericAppID });
        
        if (isMounted) {
          zimRef.current = instance;
          setZimInstance(instance);
          setIsZimReady(true);
          setDebugInfo("ZIM instance created successfully");
          console.log("ZIM instance created and ready:", instance);
        }
      } catch (error) {
        console.error("Failed to create ZIM instance:", error);
        setError(`Failed to initialize ZIM: ${error.message}`);
        setDebugInfo(`Error: ${error.message}`);
      }
    };

    initZim();

    return () => {
      isMounted = false;
      if (zimRef.current) {
        console.log("🧹 Cleaning up ZIM instance");
        try {
          zimRef.current.destroy();
        } catch (e) {
          console.error("Error during cleanup:", e);
        }
        zimRef.current = null;
      }
    };
  }, [appID, error]);

  useEffect(() => {
    if (!zimInstance) return;

    console.log("Setting up ZIM event listeners");

    const handleError = (zim, errorInfo) => {
      console.log("ZIM error:", errorInfo.code, errorInfo.message);
      setError(`ZIM Error: ${errorInfo.message} (Code: ${errorInfo.code})`);
    };

    const handleConnectionStateChanged = (zim, { state, event }) => {
      console.log("🔌 Connection state:", state, event);
      setDebugInfo(`Connection: ${state} - ${event}`);
    };

    const handlePeerMessageReceived = (zim, { messageList }) => {
      console.log("New message received:", messageList);
      const messagesWithTimestamp = messageList.map(msg => ({
        ...msg,
        timestamp: msg.timestamp || Date.now()
      }));
      setMessages((prev) => [...prev, ...messagesWithTimestamp]);
    };

    const handleTokenWillExpire = (zim, { second }) => {
      console.log("Token will expire in", second, "seconds");
      const token = selectedUser === "Aman" ? tokenA : tokenB;
      zimInstance.renewToken(token)
        .then(() => console.log("Token renewed"))
        .catch(err => console.error("Token renewal error:", err));
    };

    zimInstance.on("error", handleError);
    zimInstance.on("connectionStateChanged", handleConnectionStateChanged);
    zimInstance.on("peerMessageReceived", handlePeerMessageReceived);
    zimInstance.on("tokenWillExpire", handleTokenWillExpire);

    return () => {
      if (zimInstance) {
        zimInstance.off("error", handleError);
        zimInstance.off("connectionStateChanged", handleConnectionStateChanged);
        zimInstance.off("peerMessageReceived", handlePeerMessageReceived);
        zimInstance.off("tokenWillExpire", handleTokenWillExpire);
      }
    };
  }, [zimInstance, selectedUser, tokenA, tokenB]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleLogin = async () => {
    console.log("Login clicked for user:", selectedUser);
    setError(null);
    
    if (!zimInstance || !isZimReady) {
      console.log("ZIM instance not ready yet");
      setError("ZIM instance not ready. Please wait...");
      return;
    }

    const info = {
      userID: selectedUser,
      userName: selectedUser,
    };

    const token = selectedUser === "Aman" ? tokenA : tokenB;
    
    if (!token) {
      setError(`Token for ${selectedUser} is missing`);
      return;
    }

    try {
      console.log("Attempting login...");
      setDebugInfo("Logging in...");
      
      await zimInstance.login(info, token);
      console.log("Login successful for:", selectedUser);
      setIsLoggedIn(true);
      setUserInfo(info);
      setDebugInfo("Login successful");
    } catch (error) {
      console.error("Login failed:", error);
      setError(`Login failed: ${error.message || error}`);
      setDebugInfo(`Login error: ${error.message || error}`);
    }
  };

  const handleSendMessage = async () => {
    if (!isLoggedIn || !messageText.trim() || !zimInstance) return;

    const receiver = selectedUser === "Aman" ? "Amit" : "Aman";
    const messageTextObj = {
      type: 1,
      message: messageText.trim(),
      extendedData: "",
    };

    const config = { priority: 1 };

    try {
      console.log("Sending message to:", receiver);
      const result = await zimInstance.sendMessage(messageTextObj, receiver, 0, config);
      
      const messageWithTimestamp = {
        ...result.message,
        timestamp: result.message.timestamp || Date.now()
      };
      
      setMessages((prev) => [...prev, messageWithTimestamp]);
      setMessageText("");
      console.log("Message sent successfully");
    } catch (error) {
      console.error("Send failed:", error);
      setError(`Failed to send message: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    if (zimInstance && isLoggedIn) {
      try {
        await zimInstance.logout();
        setIsLoggedIn(false);
        setMessages([]);
        setUserInfo(null);
        setError(null);
        setDebugInfo("Logged out successfully");
        console.log("Logged out successfully");
      } catch (error) {
        console.error("Logout failed:", error);
        setError(`Logout failed: ${error.message}`);
      }
    }
  };

  return (
    <div className="p-[20px] w-full h-[100vh] flex items-center flex-col"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <h1 className="text-white font-bold text-[30px]">Real Time Chat App</h1>
      
      {/* Error Information Only */}
      {error && (
        <div className="mt-2 text-red-300 text-sm text-center max-w-md">
          Error: {error}
        </div>
      )}

      {!isLoggedIn ? (
        <div className="w-[90%] max-w-[600px] h-[400px] overflow-auto p-[20px] backdrop-blur shadow-2xl bg-[#00000050] mt-[30px] rounded-xl flex flex-col items-center justify-center gap-[30px] border-2 border-gray-700">
          <h1 className="text-[30px] font-semibold text-white">Select User</h1>
          <select
            className="w-[50%] px-4 py-2 rounded-lg bg-[#1f2525] text-white font-medium border border-gray-600"
            onChange={(e) => setSelectedUser(e.target.value)}
            value={selectedUser}
          >
            <option value="Aman">Aman</option>
            <option value="Amit">Amit</option>
          </select>
          <button
            className={`p-[10px] font-semibold cursor-pointer text-black rounded-lg w-[100px] ${
              isZimReady && !error ? "bg-white hover:bg-gray-200" : "bg-gray-400 cursor-not-allowed"
            }`}
            onClick={handleLogin}
            disabled={!isZimReady || error}
          >
            {isZimReady ? "Login" : "Loading..."}
          </button>
        </div>
      ) : (
        <div className="w-full max-w-[700px] mt-[30px] flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-4">
            <h2 className="text-white text-xl">
              {selectedUser} chatting with {selectedUser === "Aman" ? "Amit" : "Aman"}
            </h2>
            <button
              className="bg-red-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-red-600"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>

          <div className="bg-[#0d1117] w-full h-[500px] rounded-lg border border-gray-600 flex flex-col">
            {/* Chat Header */}
            <div className="bg-[#1c2128] p-4 rounded-t-lg border-b border-gray-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                  {(selectedUser === "Aman" ? "Amit" : "Aman").charAt(0)}
                </div>
                <div>
                  <h3 className="text-white font-semibold">
                    {selectedUser === "Aman" ? "Amit" : "Aman"}
                  </h3>
                  <p className="text-green-400 text-sm">Online</p>
                </div>
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.length === 0 ? (
                <div className="text-gray-400 text-center py-8 flex flex-col items-center">
                  <div className="text-4xl mb-2">💬</div>
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwnMessage = msg.senderUserID === selectedUser;
                  const messageTime = msg.timestamp ? new Date(msg.timestamp) : new Date();
                  
                  return (
                    <div
                      key={index}
                      className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-2`}
                    >
                      <div
                        className={`max-w-[75%] p-3 rounded-2xl ${
                          isOwnMessage 
                            ? "bg-green-600 text-white rounded-br-md" 
                            : "bg-gray-700 text-white rounded-bl-md"
                        }`}
                      >
                        {!isOwnMessage && (
                          <div className="text-sm font-semibold text-green-400 mb-1">
                            {msg.senderUserID}
                          </div>
                        )}
                        <div className="text-sm leading-relaxed">{msg.message}</div>
                        <div className={`text-xs mt-2 ${
                          isOwnMessage ? "text-green-100" : "text-gray-400"
                        }`}>
                          {messageTime.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messageEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-[#1c2128] rounded-b-lg border-t border-gray-600">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#0d1117] rounded-full border border-gray-600 px-4 py-2 flex items-center gap-2">
                  <input
                    className="flex-1 bg-transparent outline-none text-white placeholder-gray-400"
                    type="text"
                    value={messageText}
                    placeholder="Type a message..."
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                <button
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    messageText.trim() 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  }`}
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;