// const { GoogleGenerativeAI, SchemaType } =  require('@google/generative-ai');

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// const orderSlipSchema = {
//   type: SchemaType.OBJECT,
//   properties: {
//     items: {
//       type: SchemaType.ARRAY,
//       description: "List of items parsed from user text or prescription image",
//       items: {
//         type: SchemaType.OBJECT,
//         properties: {
//           name: { type: SchemaType.STRING, description: "Item or Medicine name" },
//           quantity: { type: SchemaType.INTEGER, description: "Quantity ordered" },
//           dosage: { type: SchemaType.STRING, description: "Dosage/strength e.g., 500mg, 10ml, or empty for non-pharmacy" },
//           estimatedUnitPrice: { type: SchemaType.NUMBER, description: "Estimated price per single unit" }
//         },
//         required: ["name", "quantity", "estimatedUnitPrice"]
//       }
//     },
//     customerNotes: { type: SchemaType.STRING, description: "Instructions or patient notes" }
//   },
//   required: ["items"]
// };

// exports.parseOrderWithGemini = async ({ category, textPrompt, imageBuffer, mimeType }) => {
//   const model = genAI.getGenerativeModel({
//     model: "gemini-3.6-flash",
//     generationConfig: {
//       responseMimeType: "application/json",
//       responseSchema: orderSlipSchema
//     }
//   });

//   const parts = [];

//   if (imageBuffer && mimeType) {
//     parts.push({
//       inlineData: {
//         data: imageBuffer.toString("base64"),
//         mimeType
//       }
//     });
//   }

//   // Dynamic system instructions based on Category
//   let categoryContext = "";
//   if (category === "pharmacy") {
//     categoryContext = "Category is pharmacy. Extract medicine names, dosages (e.g. 500mg), and quantities from the handwritten prescription or text.";
//   } else {
//     categoryContext = `Category is ${category || 'food/grocery'}. Extract food/grocery items, quantities, and estimated prices.`;
//   }

//   const promptText = `
//     ${categoryContext}
//     User Text: "${textPrompt || 'Parsed from attached image'}"
//   `;

//   parts.push(promptText);

//   const result = await model.generateContent(parts);
//   return JSON.parse(result.response.text());
// };

const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: "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",
});

exports.main = async () => {
  const chatCompletion = await getGroqChatCompletion();
  // Print the completion returned by the LLM.
  console.log(chatCompletion.choices[0]?.message?.content || "");
};

exports.getGroqChatCompletion = () => {
  return groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: "Explain the importance of fast language models",
      },
    ],
    model: "openai/gpt-oss-20b",
  });
};

// exports.parseOrderWithGroq = async ({ category, textPrompt }) => {
//   try {
//     let categoryContext = "";
//     console.log("Category for Groq Parsing:", category);
//     if (category === "pharmacy") {
//       categoryContext =
//         "Extract medicine names, dosage/strength (e.g. 500mg, 10ml), and quantities from the text.";
//     } else {
//       categoryContext = `Category is ${category || "food/grocery"}. Extract food/grocery items, quantities, and estimated unit prices.`;
//     }

//     console.log("Category for Groq Parsing:", categoryContext);
//     const systemPrompt = `
//     You are an AI order parser for the OmniGo platform.
//     ${categoryContext}

//     You MUST respond strictly with valid JSON. Do not include markdown formatting or extra text.
//     JSON structure must be:
//     {
//         "items": [
//           {
//             "name": "Item or Medicine Name",
//             "quantity": 1,
//             "dosage": "500mg or empty string",
//             "estimatedUnitPrice": 5.00
//             }
//             ],
//             "customerNotes": "Any additional customer instructions"
//             }
//             `;
//     console.log("Category for Groq Parsing:", textPrompt);
//     console.log("Category for Groq Parsing:", systemPrompt);

//     const chatCompletion = await groq.chat.completions.create({
//       messages: [
//         { role: "system", content: systemPrompt },
//         { role: "user", content: textPrompt || "No prompt provided" },
//       ],
//       model: "openai/gpt-oss-20b",
//     });
//     console.log("Category for Groq Parsing:", chatCompletion.choices[0]?.message?.content || "{}");
//     console.log("Category for Groq Parsing:", chatCompletion);

//     const responseText = chatCompletion.choices[0]?.message?.content || "{}";
//     return JSON.parse(responseText);
//   } catch (error) {
//     console.error("Groq Order Parse Error:", error);
//     throw new Error("Failed to parse order via Groq: " + error.message);
//   }
// };

exports.parseOrderWithGroq = async ({
  category,
  textPrompt,
  imageBuffer,
  mimeType,
}) => {
  try {
    let categoryContext = "";
    if (category === "PHARMACY") {
      categoryContext =
        "Extract medicine names, dosage/strength (e.g. 500mg, 10ml), and quantities from the text or image.";
    } else {
      categoryContext = `Category is ${category || "FOOD/GROCERY"}. Extract food/grocery items, quantities, and estimated unit prices.`;
    }

    console.log("Category for Groq Parsing:", categoryContext);

    const systemPrompt = `
      You are an AI order parser for OmniGo.
      ${categoryContext}

      Respond strictly with valid JSON matching this schema:
      {
        "items": [
          {
            "name": "Item or Medicine Name",
            "quantity": 1,
            "dosage": "500mg or empty string",
            "estimatedUnitPrice": 5.00
          }
        ],
        "customerNotes": "Any additional notes"
      }
    `;

    let modelName = "openai/gpt-oss-20b";
    let userContent;

    // Check if image buffer exists
    if (imageBuffer && mimeType) {
      console.log(
        "Image buffer detected. Switching to image-capable model.",
        imageBuffer,
        imageBuffer.length,
        mimeType,
      );
      modelName = "qwen/qwen3.6-27b"; // Active Vision Model
      const base64Image = imageBuffer.toString("base64");

      console.log("Base64 Image Length:", base64Image, base64Image.length);
      console.log("Base64 Image:", base64Image.substring(0, 100) + "...");
      userContent = [
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
        {
          type: "text",
          text:
            textPrompt || "Extract items from this list or prescription image",
        },
      ];

      console.log("User content for Groq Parsing with image:", userContent);
    } else {
      // Must be a pure string for text models
      userContent = textPrompt || "No text provided";
      console.log("User content for Groq Parsing with text:", userContent);
    }

    console.log(
      "Category for Groq Parsing:",
      systemPrompt,
      userContent,
      modelName,
    );
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      model: modelName,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });
    console.log(
      "Category for Groq Parsing:",
      chatCompletion.choices[0]?.message?.content || "{}",
    );
    console.log("Category for Groq Parsing:", chatCompletion);

    const responseText = chatCompletion.choices[0]?.message?.content || "{}";
    console.log("Category for Groq Parsing:", responseText);
    console.log("Category for Groq Parsing:", JSON.parse(responseText));
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Groq Order Parse Error:", error);
    throw new Error("Failed to parse order via Groq: " + error.message);
  }
};
