/**
 * AI API utility for generating classified descriptions
 * Supports multiple AI providers (GPT, Gemini, Claude) via database-stored API keys
 */

'use client'

import { createClient } from './supabase/client'

interface ApiKeyConfig {
  provider: 'gpt' | 'gemini' | 'claude' | 'other';
  model: string;
  api_key: string;
}

/**
 * Fetch the active API key from the database
 * @param provider - The AI provider (default: 'gpt')
 * @param model - The model name (default: 'gpt-4')
 * @returns API key configuration
 */
async function getActiveApiKey(
  provider: 'gpt' | 'gemini' | 'claude' | 'other' = 'gpt',
  model: string = 'gpt-4'
): Promise<ApiKeyConfig> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('api_keys')
      .select('provider, model, api_key')
      .eq('provider', provider)
      .eq('model', model)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      // Try to find any active key for the provider
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('api_keys')
        .select('provider, model, api_key')
        .eq('provider', provider)
        .eq('is_active', true)
        .limit(1);

      if (fallbackError || !fallbackData || fallbackData.length === 0) {
        throw new Error(
          `No active API key found for ${provider}. Please configure an API key in Admin Settings.`
        );
      }

      return {
        provider: fallbackData[0].provider as 'gpt' | 'gemini' | 'claude' | 'other',
        model: fallbackData[0].model,
        api_key: fallbackData[0].api_key
      };
    }

    return {
      provider: data.provider as 'gpt' | 'gemini' | 'claude' | 'other',
      model: data.model,
      api_key: data.api_key
    };
  } catch (error: any) {
    console.error('Error fetching API key from database:', error);
    throw new Error(
      error.message || 'Failed to fetch API key. Please configure an API key in Admin Settings.'
    );
  }
}

export interface GenerateDescriptionParams {
  title?: string;
  shortDescription: string;
}

export interface GeneratedDescription {
  title: string;
  description: string;
  paragraphs: string[];
  seoKeywords: string[];
  meta_description?: string;
  meta_keywords?: string;
  focus_keyword?: string;
}

/**
 * Generate a detailed classified description using AI (GPT, Gemini, Claude, etc.)
 * Returns 2-6 paragraphs, each approximately 150-220 words
 */
export async function generateClassifiedDescription(
  params: GenerateDescriptionParams,
  provider: 'gpt' | 'gemini' | 'claude' | 'other' = 'gpt',
  model?: string
): Promise<GeneratedDescription> {
  // Fetch active API key from database (use default model if not provided)
  const defaultModel = model || (provider === 'gpt' ? 'gpt-4' : provider === 'gemini' ? 'gemini-pro' : 'claude-3-opus');
  const apiKeyConfig = await getActiveApiKey(provider, defaultModel);
  const { api_key: API_KEY, model: activeModel } = apiKeyConfig;
  
  // Log API key status (without exposing the key)
  console.log('API Key status:', {
    provider: apiKeyConfig.provider,
    model: activeModel,
    exists: !!API_KEY,
    keyLength: API_KEY.length
  });

  const titlePrompt = params.title
  ? `Create ONE original, SEO-optimized title (60–70 characters) for a Direct Selling / MLM / Network Marketing classified.

  
Reference: ${params.title}

Rules:
- High click intent, non-generic phrasing
- Natural keyword use, no repetition
- 100% plagiarism-free

Return only the title text.`
  : `Create ONE original, SEO-optimized title (60–70 characters) for a Direct Selling / MLM / Network Marketing classified.

Context: ${params.shortDescription}

Rules:
- High click intent, non-generic phrasing
- Natural keyword use, no repetition
- 100% plagiarism-free

Return only the title text.`;
  const descriptionPrompt = `
Write a professional, SEO-optimized classified ad for Direct Selling / MLM / Network Marketing.

Context:
${params.title ? `Title: ${params.title}\n` : ''}Summary: ${params.shortDescription}

Requirements:
- Write **2 to 6 paragraphs** (choose naturally)
- ~150–220 words per paragraph
- Fully original, plagiarism-free, non-repetitive
- Focus on benefits, opportunity, credibility, growth
- End with a strong, action-driven CTA

SEO:
- Use varied, relevant keywords naturally
- Avoid fixed phrasing or clichés

HTML:
- Wrap each paragraph in <p></p>
- Use <strong> 2–3 times per paragraph
- Bold urgency in the CTA paragraph
- Return ONLY valid HTML
`;

  try {
    // First, generate the title if not provided
    let generatedTitle = params.title || '';
    
    if (!params.title) {
      // Determine API endpoint based on provider
      let apiUrl = 'https://api.openai.com/v1/chat/completions';
      if (apiKeyConfig.provider === 'gemini') {
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent`;
      } else if (apiKeyConfig.provider === 'claude') {
        apiUrl = 'https://api.anthropic.com/v1/messages';
      }

      // For now, we support GPT. Gemini and Claude support can be added later
      if (apiKeyConfig.provider !== 'gpt') {
        throw new Error(`AI provider "${apiKeyConfig.provider}" is not yet supported. Please use GPT provider.`);
      }

      const titleResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: activeModel,
          messages: [
            {
              role: 'system',
              content: 'You are an SEO expert specializing in creating optimized titles for network marketing opportunities. Generate concise, keyword-rich titles (60-70 characters) that are compelling and SEO-friendly.'
            },
            {
              role: 'user',
              content: titlePrompt
            }
          ],
          temperature: 0.8,
          max_tokens: 100
        })
      });

      if (titleResponse.ok) {
        const titleData = await titleResponse.json();
        generatedTitle = titleData.choices[0]?.message?.content?.trim() || params.shortDescription.substring(0, 70);
        // Remove quotes if present
        generatedTitle = generatedTitle.replace(/^["']|["']$/g, '');
      }
    }

    // Determine API endpoint based on provider
    let apiUrl = 'https://api.openai.com/v1/chat/completions';
    if (apiKeyConfig.provider === 'gemini') {
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent`;
    } else if (apiKeyConfig.provider === 'claude') {
      apiUrl = 'https://api.anthropic.com/v1/messages';
    }

    // For now, we support GPT. Gemini and Claude support can be added later
    if (apiKeyConfig.provider !== 'gpt') {
      throw new Error(`AI provider "${apiKeyConfig.provider}" is not yet supported. Please use GPT provider.`);
    }

    // Generate the description
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: activeModel,
        messages: [
          {
            role: 'system',
            content: 'You are a professional SEO copywriter specializing in Direct Selling / MLM / Network Marketing classified ads. Write original, engaging, SEO-optimized content with proper HTML formatting. Focus on benefits, opportunities, and credibility.'
          },
          {
            role: 'user',
            content: descriptionPrompt
          }
        ],
        temperature: 0.8,
        max_tokens: 2500
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      const errorMessage = errorData.error?.message || `OpenAI API error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    let generatedText = data.choices[0]?.message?.content || '';

    if (!generatedText) {
      throw new Error('No content generated from OpenAI');
    }

    // Clean up the generated HTML
    generatedText = generatedText.trim();
    
    // If the response doesn't have <p> tags, add them
    if (!generatedText.includes('<p>')) {
      // Split by double line breaks and wrap in <p> tags
      const paragraphs = generatedText
        .split(/\n\s*\n/)
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 0);
      
      generatedText = paragraphs.map((p: string) => {
        // Add <strong> tags to important keywords (first few key phrases)
        let formatted = p;
        // Bold common network marketing keywords if they appear
        const keywords = ['opportunity', 'income', 'success', 'business', 'network', 'marketing', 'earn', 'profit'];
        keywords.forEach(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          formatted = formatted.replace(regex, `<strong>${keyword}</strong>`);
        });
        return `<p>${formatted.replace(/\n/g, '<br>')}</p>`;
      }).join('\n');
    }

    // Extract paragraphs from HTML
    const paragraphMatches = generatedText.match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
    const paragraphs = paragraphMatches.map((p: string) => {
      return p.replace(/<\/?p[^>]*>/g, '').trim();
    });

    // Extract SEO keywords from the content (simple extraction)
    const textContent = generatedText.replace(/<[^>]*>/g, ' ');
    const words = textContent.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const wordFreq: { [key: string]: number } = {};
    words.forEach((word: string) => {
      if (word.length > 4 && !['this', 'that', 'with', 'from', 'your', 'have', 'will', 'been', 'their'].includes(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    const seoKeywords = Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    // Generate meta description (150-160 characters)
    const plainText = generatedText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const meta_description = plainText.substring(0, 160).trim();
    
    // Generate meta keywords (comma-separated, top 5-7 keywords)
    const meta_keywords = seoKeywords.slice(0, 7).join(', ');
    
    // Generate focus keyword (most important keyword, usually first or most frequent)
    const focus_keyword = seoKeywords.length > 0 ? seoKeywords[0] : '';

    return {
      title: generatedTitle,
      description: generatedText,
      paragraphs: paragraphs.length > 0 ? paragraphs : [generatedText.replace(/<[^>]*>/g, '')],
      seoKeywords,
      meta_description,
      meta_keywords,
      focus_keyword
    };
  } catch (error: any) {
    console.error('OpenAI API Error Details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      fullError: error
    });
    
    // Provide more specific error messages
    if (error.message?.includes('API key') || error.message?.includes('No active API key')) {
      throw new Error('No active API key configured. Please configure an API key in Admin Settings > API Settings.');
    }
    if (error.message?.includes('rate limit')) {
      throw new Error('API rate limit exceeded. Please try again later.');
    }
    if (error.message?.includes('model')) {
      throw new Error('AI model not available. Please check your API key and account access.');
    }
    
    throw new Error(error.message || 'Failed to generate description. Please check the browser console for details.');
  }
}

/**
 * Generate a detailed blog post content using AI (GPT, Gemini, Claude, etc.)
 * Returns comprehensive blog content with SEO optimization
 */
export async function generateBlogDescription(
  params: GenerateDescriptionParams,
  provider: 'gpt' | 'gemini' | 'claude' | 'other' = 'gpt',
  model?: string
): Promise<GeneratedDescription> {
  // Fetch active API key from database (use default model if not provided)
  const defaultModel = model || (provider === 'gpt' ? 'gpt-4' : provider === 'gemini' ? 'gemini-pro' : 'claude-3-opus');
  const apiKeyConfig = await getActiveApiKey(provider, defaultModel);
  const { api_key: API_KEY, model: activeModel } = apiKeyConfig;
  
  // Log API key status (without exposing the key)
  console.log('API Key status:', {
    provider: apiKeyConfig.provider,
    model: activeModel,
    exists: !!API_KEY,
    keyLength: API_KEY.length
  });

  const titlePrompt = params.title
    ? `Create ONE original, SEO-optimized blog title (60–70 characters) for a network marketing / MLM blog post.

Reference: ${params.title}

Rules:
- High click intent, non-generic phrasing
- Natural keyword use, no repetition
- 100% plagiarism-free

Return only the title text.`
    : `Create ONE original, SEO-optimized blog title (60–70 characters) for a network marketing / MLM blog post.

Context: ${params.shortDescription}

Rules:
- High click intent, non-generic phrasing
- Natural keyword use, no repetition
- 100% plagiarism-free

Return only the title text.`;

  const descriptionPrompt = `
Write a comprehensive, SEO-optimized blog post for Direct Selling / MLM / Network Marketing.

Context:
${params.title ? `Title: ${params.title}\n` : ''}Topic: ${params.shortDescription}

Requirements:
- Write **5 to 8 paragraphs** (choose naturally based on topic depth)
- ~150–250 words per paragraph
- Fully original, plagiarism-free, non-repetitive
- Include introduction, main content sections, and conclusion
- Focus on value, insights, tips, and actionable advice
- End with a strong, engaging conclusion

SEO:
- Use varied, relevant keywords naturally
- Avoid fixed phrasing or clichés
- Include subheadings with <h2> tags for structure

HTML:
- Wrap each paragraph in <p></p>
- Use <h2> for main section headings (2-3 headings)
- Use <strong> 2–3 times per paragraph for emphasis
- Return ONLY valid HTML
`;

  try {
    // First, generate the title if not provided
    let generatedTitle = params.title || '';
    
    if (!params.title) {
      // Determine API endpoint based on provider
      let apiUrl = 'https://api.openai.com/v1/chat/completions';
      if (apiKeyConfig.provider === 'gemini') {
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent`;
      } else if (apiKeyConfig.provider === 'claude') {
        apiUrl = 'https://api.anthropic.com/v1/messages';
      }

      // For now, we support GPT. Gemini and Claude support can be added later
      if (apiKeyConfig.provider !== 'gpt') {
        throw new Error(`AI provider "${apiKeyConfig.provider}" is not yet supported. Please use GPT provider.`);
      }

      const titleResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: activeModel,
          messages: [
            {
              role: 'system',
              content: 'You are an SEO expert specializing in creating optimized blog titles for network marketing content. Generate concise, keyword-rich titles (60-70 characters) that are compelling and SEO-friendly.'
            },
            {
              role: 'user',
              content: titlePrompt
            }
          ],
          temperature: 0.8,
          max_tokens: 100
        })
      });

      if (titleResponse.ok) {
        const titleData = await titleResponse.json();
        generatedTitle = titleData.choices[0]?.message?.content?.trim() || params.shortDescription.substring(0, 70);
        // Remove quotes if present
        generatedTitle = generatedTitle.replace(/^["']|["']$/g, '');
      }
    }

    // Determine API endpoint based on provider
    let apiUrl = 'https://api.openai.com/v1/chat/completions';
    if (apiKeyConfig.provider === 'gemini') {
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent`;
    } else if (apiKeyConfig.provider === 'claude') {
      apiUrl = 'https://api.anthropic.com/v1/messages';
    }

    // For now, we support GPT. Gemini and Claude support can be added later
    if (apiKeyConfig.provider !== 'gpt') {
      throw new Error(`AI provider "${apiKeyConfig.provider}" is not yet supported. Please use GPT provider.`);
    }

    // Generate the blog content
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: activeModel,
        messages: [
          {
            role: 'system',
            content: 'You are a professional SEO blog writer specializing in Direct Selling / MLM / Network Marketing content. Write original, engaging, SEO-optimized blog posts with proper HTML formatting. Focus on providing value, insights, and actionable advice.'
          },
          {
            role: 'user',
            content: descriptionPrompt
          }
        ],
        temperature: 0.8,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      const errorMessage = errorData.error?.message || `OpenAI API error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    let generatedText = data.choices[0]?.message?.content || '';

    if (!generatedText) {
      throw new Error('No content generated from OpenAI');
    }

    // Clean up the generated HTML
    generatedText = generatedText.trim();
    
    // If the response doesn't have <p> tags, add them
    if (!generatedText.includes('<p>')) {
      // Split by double line breaks and wrap in <p> tags
      const paragraphs = generatedText
        .split(/\n\s*\n/)
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 0);
      
      generatedText = paragraphs.map((p: string) => {
        // Add <strong> tags to important keywords
        let formatted = p;
        const keywords = ['opportunity', 'income', 'success', 'business', 'network', 'marketing', 'earn', 'profit', 'growth', 'strategy'];
        keywords.forEach(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          formatted = formatted.replace(regex, `<strong>${keyword}</strong>`);
        });
        return `<p>${formatted}</p>`;
      }).join('\n\n');
    }

    // Extract paragraphs for SEO analysis
    const paragraphMatches = generatedText.match(/<p>([^<]+)<\/p>/g) || [];
    const paragraphs = paragraphMatches.map((p: string) => p.replace(/<\/?p>/g, '').trim());

    // Extract SEO keywords (simple extraction - can be enhanced)
    const textContent = generatedText.replace(/<[^>]*>/g, ' ').toLowerCase();
    const commonWords = (textContent.match(/\b(network marketing|mlm|direct selling|opportunity|income|success|business|growth|strategy|earn|profit)\b/gi) || []) as string[];
    const seoKeywords: string[] = [...new Set(commonWords.map((w: string) => w.toLowerCase()))].slice(0, 10);

    // Generate meta description
    const firstParagraph = paragraphs[0] || '';
    const metaDescription = firstParagraph.substring(0, 155).trim() + (firstParagraph.length > 155 ? '...' : '');

    // Generate meta keywords
    const metaKeywords = seoKeywords.slice(0, 5).join(', ');

    // Generate focus keyword (first main keyword)
    const focusKeyword = seoKeywords[0] || 'network marketing';

    return {
      title: generatedTitle,
      description: generatedText,
      paragraphs,
      seoKeywords,
      meta_description: metaDescription,
      meta_keywords: metaKeywords,
      focus_keyword: focusKeyword
    };
  } catch (error: any) {
    console.error('Error generating blog content:', error);
    
    // Provide more specific error messages
    if (error.message?.includes('API key') || error.message?.includes('No active API key')) {
      throw new Error('No active API key configured. Please configure an API key in Admin Settings > API Settings.');
    }
    if (error.message?.includes('rate limit')) {
      throw new Error('API rate limit exceeded. Please try again later.');
    }
    if (error.message?.includes('model')) {
      throw new Error('AI model not available. Please check your API key and account access.');
    }
    
    throw new Error(error.message || 'Failed to generate blog content. Please check the browser console for details.');
  }
}

