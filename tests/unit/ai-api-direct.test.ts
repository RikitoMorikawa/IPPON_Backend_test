import { describe, it, expect } from 'vitest';
import axios from 'axios';

describe('AI API Direct Integration Test', () => {
  it('should call Meeting Report API directly', async () => {
    console.log('🚀 Meeting Report APIのテストを開始...');
    
    const meetingReportData = {
      inquiry_infos: [
        {
          inquiry_id: 'INQ-20241215-001',
          customer_id: 'cust-001',
          customer_name: '田中太郎',
          property_name: 'テストマンション',
          inquiry_type: 'email',
          inquiry_title: '新規問い合わせ',
          summary: '本日、田中太郎様より物件の詳細についてお問い合わせをいただきました。まず、間取りについて詳しくご説明させていただきました。3LDKの間取りで、リビングダイニングは約20畳と広々としており、南向きのため日当たりも良好です。各居室も6畳以上確保されており、ファミリー世帯にも十分な広さです。価格については、近隣相場と比較してもリーズナブルな設定となっており、お客様も納得されていました。また、周辺環境については、最寄り駅まで徒歩8分と利便性が高く、近隣にはスーパーマーケット、コンビニエンスストア、小学校、中学校、公園などの生活施設が充実していることをお伝えしました。特に、お子様の教育環境を重視されているとのことでしたので、学区の評判の良さや、習い事教室の充実度についても詳しくご案内しました。お客様は全体的に好印象を持たれており、週末に奥様と一緒に内見したいとのご希望をいただきました。購入に向けて前向きにご検討いただいている状況です。',
          category: '問い合わせ',
          date: '2024-12-15',
          first_interaction_flag: true
        },
        {
          inquiry_id: 'INQ-20241220-001',
          customer_id: 'cust-002',
          customer_name: '山田花子',
          property_name: 'テストマンション',
          inquiry_type: 'phone',
          inquiry_title: '内見実施',
          summary: '本日14時より、山田花子様と内見を実施いたしました。まず、エントランスから共用部分をご案内し、オートロックシステムや宅配ボックス、管理人常駐体制などセキュリティ面の充実度をご確認いただきました。室内に入られてからは、まずリビングダイニングの広さと明るさに感動されていました。南向きの大きな窓から差し込む自然光が部屋全体を明るく照らし、バルコニーからの眺望も良好で、お客様も「想像以上に明るくて開放的」とおっしゃっていました。キッチンについては、システムキッチンの使い勝手の良さ、特に食器洗い乾燥機や浄水器が標準装備されている点を高く評価されていました。収納スペースについても、各部屋にクローゼットが設置されているほか、廊下にも大型の収納スペースがあり、「これだけ収納があれば、今の荷物も十分収まりそう」と満足されていました。浴室は1.25坪タイプで、浴室乾燥機も完備。お子様と一緒に入浴するのに十分な広さがあることも好評でした。また、床暖房が設置されている点も、冬場の快適性を考えると大きなメリットだとおっしゃっていました。内見後、お客様からは「主人と相談して、前向きに購入を検討したい」とのお言葉をいただき、住宅ローンの事前審査についてもご相談を受けました。来週中にはご主人様も一緒に再度内見したいとのご希望もいただいております。',
          category: '内見',
          date: '2024-12-20',
          first_interaction_flag: false
        }
      ]
    };

    try {
      const response = await axios.post(
        'https://summary-ai.ippon-cloud.com/api/v1/meeting-report',
        meetingReportData
      );

      console.log('Meeting Report API Response:', JSON.stringify(response.data, null, 2));
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.data).toBeDefined();
      expect(response.data.data.inquiry_infos).toBeDefined();
      expect(Array.isArray(response.data.data.inquiry_infos)).toBe(true);
      
      // AI要約が生成されていることを確認
      const summarizedInteractions = response.data.data.inquiry_infos;
      expect(summarizedInteractions.length).toBeGreaterThan(0);
      
      summarizedInteractions.forEach((interaction: any) => {
        expect(interaction.content).toBeDefined();
        expect(typeof interaction.content).toBe('string');
        console.log(`✅ AI要約: ${interaction.customer_name} - ${interaction.content}`);
      });
      
    } catch (error) {
      console.error('Meeting Report API Error:', error);
      throw error;
    }
  }, 30000);

  it('should call Summary Report API directly', async () => {
    console.log('\n🚀 Summary Report APIのテストを開始...');
    
    const summaryReportData = {
      property_id: 'prop-test-001',
      property_name: 'テストマンション',
      views_count: 100,
      inquiries_count: 2,
      business_meeting_count: 1,
      viewing_count: 1,
      report_start_date: '2024-12-01',
      report_end_date: '2024-12-31',
      customer_interactions: [
        {
          customer_id: 'cust-001',
          customer_name: '田中太郎',
          inquired_at: '2024-12-15 10:00:00',
          category: 'email',
          summary: '物件の詳細について問い合わせがありました。特に間取りや価格、周辺環境について詳しく説明しました。'
        },
        {
          customer_id: 'cust-002',
          customer_name: '山田花子',
          inquired_at: '2024-12-20 14:00:00',
          category: 'phone',
          summary: '内見を実施しました。お客様は物件の日当たりや設備に満足されていました。購入を前向きに検討中です。'
        }
      ]
    };

    try {
      const response = await axios.post(
        'https://summary-ai.ippon-cloud.com/api/v1/summary-report',
        summaryReportData
      );

      console.log('Summary Report API Response:', JSON.stringify(response.data, null, 2));
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.data).toBeDefined();
      expect(response.data.data.summary_report).toBeDefined();
      expect(typeof response.data.data.summary_report).toBe('string');
      
      console.log('✅ AI生成の全体要約:');
      console.log(response.data.data.summary_report);
      
    } catch (error) {
      console.error('Summary Report API Error:', error);
      throw error;
    }
  }, 30000);

  it('should demonstrate complete AI workflow', async () => {
    console.log('\n🎯 完全なAIワークフローのテストを開始...');
    
    // Step 1: Meeting Report API
    const meetingReportResponse = await axios.post(
      'https://summary-ai.ippon-cloud.com/api/v1/meeting-report',
      {
        inquiry_infos: [{
          inquiry_id: 'INQ-DEMO-001',
          customer_id: 'cust-demo',
          customer_name: 'デモ顧客',
          property_name: 'デモ物件',
          inquiry_type: 'email',
          inquiry_title: '新規問い合わせ',
          summary: 'お世話になっております。御社のホームページでデモ物件を拝見し、大変興味を持ちましたのでお問い合わせさせていただきました。現在、家族3人（夫婦と小学生の子供1人）で賃貸マンションに住んでおりますが、子供の成長に伴い、そろそろマイホームの購入を検討しております。デモ物件は立地条件が非常に良く、特に最寄り駅からの距離や周辺の教育環境が理想的だと感じました。つきましては、以下の点について詳しく教えていただけますでしょうか。1. 販売価格と諸費用を含めた総額の目安について。2. 住宅ローンを利用する場合の月々の返済額のシミュレーション（頭金は500万円程度を想定）。3. 引き渡し時期と入居可能時期について。4. 駐車場の有無と料金について（車を1台所有しております）。5. 管理費・修繕積立金の月額について。6. 周辺の買い物施設（スーパー、ドラッグストアなど）までの距離。7. 最寄りの小学校・中学校までの通学路の安全性について。また、実際に物件を見学させていただくことは可能でしょうか。土日であれば、いつでも都合がつきますので、ご都合の良い日時をいくつか提示していただければ幸いです。なお、他にも2〜3件の物件を検討しておりますが、立地条件を最重視しているため、御社の物件が第一候補となっております。詳細な資料もございましたら、メールに添付していただけると助かります。お忙しいところ恐れ入りますが、ご回答のほどよろしくお願いいたします。',
          category: '問い合わせ',
          date: '2024-12-25',
          first_interaction_flag: true
        }]
      }
    );

    console.log('Step 1 完了: Meeting Report API');
    const summarizedInteraction = meetingReportResponse.data.data.inquiry_infos[0];
    
    // Step 2: Summary Report API (前のステップの結果を使用)
    const summaryReportResponse = await axios.post(
      'https://summary-ai.ippon-cloud.com/api/v1/summary-report',
      {
        property_id: 'prop-demo-001',
        property_name: 'デモ物件',
        views_count: 50,
        inquiries_count: 1,
        business_meeting_count: 0,
        viewing_count: 0,
        report_start_date: '2024-12-01',
        report_end_date: '2024-12-31',
        customer_interactions: [{
          customer_id: summarizedInteraction.customer_id,
          customer_name: summarizedInteraction.customer_name,
          inquired_at: summarizedInteraction.date + ' 10:00:00',
          category: summarizedInteraction.category,
          summary: summarizedInteraction.content
        }]
      }
    );

    console.log('Step 2 完了: Summary Report API');
    console.log('\n📊 最終結果:');
    console.log('- 顧客対応要約:', summarizedInteraction.content);
    console.log('- 全体要約:', summaryReportResponse.data.data.summary_report);
    
    expect(summaryReportResponse.status).toBe(200);
    expect(summaryReportResponse.data.data.summary_report).toBeDefined();
  }, 60000);
}); 