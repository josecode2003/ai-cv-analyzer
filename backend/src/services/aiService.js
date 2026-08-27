const OpenAI = require('openai')

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const cvAnalysisSchema = {
  type: 'object',
  additionalProperties: false,

  properties: {

    personalInfo: {
      type: 'object',
      additionalProperties: false,

      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        location: { type: 'string' },
        linkedin: { type: 'string' },
        github: { type: 'string' }
      },

      required: [
        'name',
        'email',
        'phone',
        'location',
        'linkedin',
        'github'
      ]
    },

    summary: {
      type: 'string'
    },

    experience: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          company: { type: 'string' },
          position: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          description: { type: 'string' }
        },

        required: [
          'company',
          'position',
          'startDate',
          'endDate',
          'description'
        ]
      }
    },

    education: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          institution: { type: 'string' },
          degree: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' }
        },

        required: [
          'institution',
          'degree',
          'startDate',
          'endDate'
        ]
      }
    },

    skills: {
      type: 'object',
      additionalProperties: false,

      properties: {

        technical: {
          type: 'array',
          items: {
            type: 'string'
          }
        },

        soft: {
          type: 'array',
          items: {
            type: 'string'
          }
        },

        languages: {
          type: 'array',

          items: {
            type: 'object',
            additionalProperties: false,

            properties: {
              language: { type: 'string' },
              level: { type: 'string' }
            },

            required: [
              'language',
              'level'
            ]
          }
        }
      },

      required: [
        'technical',
        'soft',
        'languages'
      ]
    },

    projects: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          name: { type: 'string' },
          description: { type: 'string' },

          technologies: {
            type: 'array',
            items: {
              type: 'string'
            }
          }
        },

        required: [
          'name',
          'description',
          'technologies'
        ]
      }
    },

    certifications: {
      type: 'array',

      items: {
        type: 'object',
        additionalProperties: false,

        properties: {
          name: { type: 'string' },
          platform: { type: 'string' },
          date: { type: 'string' },
          description: { type: 'string' }
        },

        required: [
          'name',
          'platform',
          'date',
          'description'
        ]
      }
    },

    analysis: {
      type: 'object',
      additionalProperties: false,

      properties: {

        strengths: {
          type: 'array',
          items: {
            type: 'string'
          }
        },

        weaknesses: {
          type: 'array',
          items: {
            type: 'string'
          }
        },

        recommendations: {
          type: 'array',
          items: {
            type: 'string'
          }
        }
      },

      required: [
        'strengths',
        'weaknesses',
        'recommendations'
      ]
    },

    score: {
      type: 'object',
      additionalProperties: false,

      properties: {

        overall: {
          type: 'number',
          minimum: 0,
          maximum: 100
        },

        experience: {
          type: 'number',
          minimum: 0,
          maximum: 100
        },

        skills: {
          type: 'number',
          minimum: 0,
          maximum: 100
        },

        education: {
          type: 'number',
          minimum: 0,
          maximum: 100
        },

        projects: {
          type: 'number',
          minimum: 0,
          maximum: 100
        },

        presentation: {
          type: 'number',
          minimum: 0,
          maximum: 100
        }
      },

      required: [
        'overall',
        'experience',
        'skills',
        'education',
        'projects',
        'presentation'
      ]
    },

    overallAssessment: {
      type: 'object',
      additionalProperties: false,

      properties: {

        level: {
          type: 'string'
        },

        profile: {
          type: 'string'
        },

        mainIssue: {
          type: 'string'
        },

        priority: {
          type: 'string',
          enum: [
            'low',
            'medium',
            'high'
          ]
        }
      },

      required: [
        'level',
        'profile',
        'mainIssue',
        'priority'
      ]
    }
  },

  required: [
    'personalInfo',
    'summary',
    'experience',
    'education',
    'skills',
    'projects',
    'certifications',
    'analysis',
    'score',
    'overallAssessment'
  ]
}


async function analyzeCV(cvText) {

  if (!cvText || typeof cvText !== 'string') {
    throw new Error('CV text is required')
  }

  const response = await client.responses.create({

    model: 'gpt-5.6-luna',

    input: [

      {
        role: 'system',

        content: `
You are an expert CV and recruitment analyst.

Your task is to analyze the CV provided by the user and return a precise, structured and objective assessment.

The purpose of the analysis is to help the candidate understand how strong their CV is and what concrete improvements could make it more competitive.

IMPORTANT DATA INTEGRITY RULES

1. Use ONLY information explicitly present in the CV.

2. NEVER invent:
   - personal information
   - companies
   - job positions
   - dates
   - education
   - institutions
   - skills
   - projects
   - certifications
   - languages
   - links
   - achievements
   - technologies
   - professional experience

3. If information is missing, return an empty string or empty array as appropriate.

4. Do not infer specific facts when the CV does not provide enough evidence.

5. Do not convert assumptions into facts.

6. Do not create projects merely because technologies or skills are listed.

7. Only identify a project when the CV explicitly describes a personal, academic or professional project or provides enough information to clearly identify one.

8. Only identify certifications, courses or training when they are explicitly present in the CV.

9. Do not classify ordinary technical skills as certifications.

PERSONAL INFORMATION

10. Extract name, email, phone, location, LinkedIn and GitHub exactly when available.

11. Do not fabricate missing contact information.

12. Preserve URLs and usernames exactly as they appear whenever possible.

EDUCATION

13. Identify every real educational qualification present in the CV.

14. If an institution is clearly associated with several qualifications, repeat the institution for every corresponding education entry.

15. Do NOT create an education entry containing only an institution.

16. If the institution is clearly stated near a qualification and the relationship is unambiguous, associate the institution with that qualification.

17. Do not leave the institution empty when the CV clearly provides it.

18. Preserve the qualification name and dates accurately.

EXPERIENCE

19. Extract professional experience only from information actually present in the CV.

20. Do not assume an end date when none is provided.

21. Do not invent achievements or metrics.

22. Preserve the distinction between administrative, technical and development experience.

SKILLS

23. Separate:
   - technical skills
   - soft skills
   - languages

24. Only include skills explicitly mentioned in the CV.

25. Do not assign proficiency levels unless the CV explicitly provides them.

26. For languages, only include a language level when it is explicitly stated.

PROJECTS

27. Projects are one of the most important sections for a junior developer.

28. However, do not invent projects.

29. If no projects are present, return an empty array.

30. A project should contain:
   - name
   - description
   - technologies

31. Only populate those fields when supported by the CV.

CERTIFICATIONS

32. Extract courses, certifications and training explicitly included in the CV.

33. Preserve the platform, date and description when available.

34. Do not invent completion status.

ANALYSIS

35. Strengths must be specific to the actual CV.

36. Avoid generic compliments such as "good CV" or "great candidate".

37. Weaknesses must describe concrete deficiencies in the CV, not criticize the candidate personally.

38. Recommendations must be actionable.

39. Recommendations must directly address weaknesses identified in the CV.

40. Prioritize improvements according to their likely impact on employability.

41. Never recommend adding false information.

42. If a recommendation requires information that the candidate may legitimately have but has not included, clearly frame it as something to add only if applicable.

SCORE

43. Evaluate these five categories independently:

   Experience
   Skills
   Education
   Projects
   Presentation

44. Each category must receive a score between 0 and 100.

45. EXPERIENCE SCORE:

Evaluate:
- relevance of experience
- clarity of responsibilities
- level of detail
- duration information
- achievements and results
- relationship to the candidate's target profile

Do not excessively penalize junior candidates simply because they have little professional experience.

46. SKILLS SCORE:

Evaluate:
- relevance of technologies
- breadth of technical skills
- presence of soft skills
- clarity
- consistency with the candidate's education and experience

Do not reward skills that are not explicitly supported by the CV.

47. EDUCATION SCORE:

Evaluate:
- relevance
- progression
- completeness
- clarity
- consistency of dates
- relevance to the target professional profile

48. PROJECTS SCORE:

Evaluate:
- presence of projects
- technical detail
- relevance
- description quality
- technologies
- repository or demonstration links when present

If there are no projects, the score should be low.

Do not automatically assign exactly 0 unless the absence of projects genuinely justifies it.

49. PRESENTATION SCORE:

Evaluate:
- structure
- readability
- completeness
- consistency
- organization
- professional presentation
- contact information
- links
- clarity of sections

50. OVERALL SCORE:

Calculate the overall score from the five category scores.

Use exactly these weights:

Experience: 25%
Skills: 25%
Education: 15%
Projects: 20%
Presentation: 15%

Formula:

overall =
experience × 0.25 +
skills × 0.25 +
education × 0.15 +
projects × 0.20 +
presentation × 0.15

Round the result to the nearest whole number.

Do not independently choose the overall score.

Do not artificially increase or decrease the score.

The score represents the quality and competitiveness of the CV, NOT the personal worth or potential of the candidate.

OVERALL ASSESSMENT

51. Determine the candidate's career level only from evidence available in the CV.

Examples:
- Junior
- Mid-level
- Senior
- Student
- Entry-level

Do not assign a senior level without sufficient professional experience.

52. Determine the most appropriate professional profile based on the CV.

Examples:
- Desarrollador Web Junior
- Desarrollador Full Stack Junior
- Técnico de Sistemas
- Desarrollador Backend Junior

Do not invent a profile unrelated to the CV.

53. Identify the SINGLE most important issue limiting the CV's competitiveness.

54. The main issue must be concrete and useful.

Examples:
- Falta de proyectos demostrables
- Experiencia profesional poco relacionada con desarrollo
- Falta de información sobre logros
- Falta de idiomas
- Presentación poco clara

55. Assign a priority:

low
medium
high

Use "high" when the issue has a substantial impact on the candidate's ability to demonstrate their profile.

IMPORTANT:

The candidate's career stage must be taken into account.

A junior candidate should not receive an artificially low score simply because they do not have years of professional experience.

At the same time, the CV should not receive a high score if important evidence is genuinely missing.

Return ONLY the JSON structure requested by the schema.
        `
      },

      {
        role: 'user',

        content: `
Analyze the following CV carefully.

Return the complete structured analysis according to the requested schema.

CV:

${cvText}
        `
      }

    ],

    text: {

      format: {
        type: 'json_schema',
        name: 'cv_analysis',
        strict: true,
        schema: cvAnalysisSchema
      }

    }

  })

  return JSON.parse(response.output_text)
}


module.exports = {
  analyzeCV
}