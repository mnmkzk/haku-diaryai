import { http, HttpResponse, delay } from 'msw'

export const handlers = [
    // Gemini API analysis mock
    http.post('/api/entries', async ({ request }) => {
        // Add artificial delay to ensure 'processing' state is visible in tests
        await delay(500)

        return HttpResponse.json({
            id: 'test-entry-id',
            diary_text: '今日はとても良い一日だった。仕事が捗って、美味しいコーヒーも飲めた。自分を少し褒めてあげたい気分だ。',
            ai_response: '「自分を少し褒めてあげたい」……そう思えるような、とても素敵な一日を過ごせたんだね。仕事が捗って、美味しいコーヒーを味わう余裕もあった。そんな穏やかで充実した時間をあなたが持てたこと、私も自分のことのように嬉しいよ。日々頑張っているあなたが、今日という日を大切に思えていることが何よりの宝物だね。今夜はその温かい気持ちを抱きしめて、ゆっくり休んで。明日もまた、あなたの小さな幸せを聞かせてくれるのを心待ちにしているよ。',
            emotions: [
                { type: 'joy', intensity: 0.9 },
                { type: 'calm', intensity: 0.8 }
            ]
        })
    }),

    // Supabase Auth session mock
    http.get('*/auth/v1/user', () => {
        return HttpResponse.json({
            id: '00000000-0000-0000-0000-000000000000',
            email: 'test@example.com',
        })
    })
]
