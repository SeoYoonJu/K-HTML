import express from 'express';
import multer from 'multer';
import fs from 'fs';
import mysql from 'mysql2/promise';
import OpenAI from 'openai';
//import https from 'https';
import 'dotenv/config';
import bodyParser from 'body-parser';
//import path from 'path';


// Multer 설정 (파일 업로드를 위한 미들웨어)
const upload = multer({ dest: 'uploads/' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const port = 3000;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// input : 재활용할 image -> output : 재활용 방법 설명 text
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const imagePath = req.file.path;
        const imageData = fs.readFileSync(imagePath);
        const prompt = req.body.prompt;


        // 이미지 데이터를 데이터베이스에 저장
        const base64Image = Buffer.from(imageData).toString('base64');
    
        // OpenAI API 호출
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Tell me the objects you see and tell me how to recycle them. format: 1. item1: how to recycling this item in korea, yongin-si 2. item2: how to recycling this item in korea, yongin-si. The rest are the same as before like 3. 4. 5. .... For your information, url of bulky waste recycling service is https://bbegi.com/ Please tell in Korean" },
                {
                  type: "image_url",
                  image_url: { "url": `data:image/jpeg;base64,${base64Image}` },
                },
              ],
            },
          ],
        });
        
        res.json(response.choices[0].message.content);

  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});


// input : 옷 image -> output : 리폼된 옷 image
app.post('/uploads/reform', upload.single('image'), async (req, res) => {
    try {
        const imagePath = req.file.path;
        const imageData = fs.readFileSync(imagePath);
        const prompt = req.body.prompt;


        // 이미지 데이터를 데이터베이스에 저장
        const base64Image = Buffer.from(imageData).toString('base64');

        // OpenAI API 호출
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Tell me about the pattern, material, and color you see" },
                        { type: "image_url", image_url: { "url": `data:image/jpeg;base64,${base64Image}` },},
                    ],
                },
            ],
        });
        const prompt1 = response.choices[0].message.content;

        // 번역모델
        const translate = await openai.chat.completions.create({
            model: "gpt-4", 
            messages: [
            { role: "user", content: `Please translate the following text from Korean to English: "${prompt}"`},
            ],
        });
        const prompt2 = translate.choices[0].message.content;
        
        // 임시 파일 삭제
        fs.unlinkSync(imagePath);
  
        const dall = await openai.images.generate({
            model: "dall-e-3",
            prompt: `Do the command of "${prompt1}" with the characteristic "${prompt2}".`,
            n: 1,
            size: "1024x1024",
          });

        const image_url = dall.data[0].url;
        res.json(image_url)
    }
    catch (error) {
        console.error('Error fetching image:', error);
        res.status(500).json({ error: 'Failed to fetch image' });}
  });


// 챗봇 api -> finetuning 필요
app.post('/generate-text', async (req, res) => {
    const userInput = req.body.prompt;
  
    if (!userInput) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
  
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4", // 또는 다른 지원 모델
        messages: [
          { role: "user", content: userInput },
        ],
      });
  
      const aiResponse = response.choices[0].message.content;
      res.json({ response: aiResponse });
    } catch (error) {
      console.error('Error generating text:', error);
      res.status(500).json({ error: 'Failed to generate text' });
    }
  });


// 서버 시작
app.listen(port, () => {
  console.log(`서버가 ${port} 포트에서 실행 중입니다.`);
});

