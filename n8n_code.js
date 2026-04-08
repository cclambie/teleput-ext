const text = $input.first().json.body.text;
const url = $input.first().json.body.url;

let messageText = text;

// Check if it's a tel: link
if (url && url.startsWith('tel:')) {
  // Extract phone number and remove spaces/encoding
  let phoneNumber = url.substring(4).replace(/%20/g, '').replace(/\s/g, '');
  
  // If it doesn't start with +, add Australian country code
  if (!phoneNumber.startsWith('+')) {
    // Remove leading 0 if present (Australian format)
    if (phoneNumber.startsWith('0')) {
      phoneNumber = phoneNumber.substring(1);
    }
    // Add +61 for Australia
    phoneNumber = '+61' + phoneNumber;
  }
  
  messageText = phoneNumber;
}

return {
  chat_id: "1133749209",
  text: messageText
};
