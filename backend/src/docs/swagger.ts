const bearer = [{ bearerAuth: [] }];

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'PulseBoard Platform API',
    version: '1.0.0',
    description: 'REST API for users, projects, tasks, search, and AI summaries.',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      accessCookie: { type: 'apiKey', in: 'cookie', name: 'accessToken' },
      refreshCookie: { type: 'apiKey', in: 'cookie', name: 'refreshToken' },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Aman Gupta' },
                  email: { type: 'string', example: 'aman@example.com' },
                  password: { type: 'string', example: 'secret123' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'User created. Verification OTP is sent by email.' } },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify email OTP',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'otp'],
                properties: {
                  email: { type: 'string', example: 'aman@example.com' },
                  otp: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Email verified' },
          '400': { description: 'Invalid or expired OTP' },
        },
      },
    },
    '/auth/resend-verification': {
      post: {
        tags: ['Auth'],
        summary: 'Resend email verification OTP',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', example: 'aman@example.com' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Verification OTP sent' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and set access/refresh cookies',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'aman@example.com' },
                  password: { type: 'string', example: 'secret123' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Authenticated. Sets accessToken and refreshToken cookies.' },
          '403': { description: 'Email is not verified' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        security: [{ refreshCookie: [] }],
        responses: {
          '200': { description: 'New accessToken and refreshToken cookies set' },
          '401': { description: 'Invalid or expired refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out and clear auth cookies',
        security: [{ refreshCookie: [] }],
        responses: { '200': { description: 'Logged out successfully' } },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Send password reset link',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', example: 'aman@example.com' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Reset link sent if account exists' } },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using reset token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string', example: 'reset-token-from-email' },
                  password: { type: 'string', example: 'newsecret123' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Password reset. All refresh tokens deleted.' },
          '400': { description: 'Invalid or expired reset token' },
        },
      },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Current user', security: bearer, responses: { '200': { description: 'OK' } } },
    },
    '/auth/socket-token': {
      get: {
        tags: ['Auth'],
        summary: 'Create short-lived JWT for Socket.IO',
        security: bearer,
        responses: { '200': { description: 'Socket token created' } },
      },
    },
    '/projects': {
      get: { tags: ['Projects'], summary: 'List my projects', security: bearer, responses: { '200': { description: 'OK' } } },
      post: {
        tags: ['Projects'],
        summary: 'Create a project',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'Website Redesign' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/projects/{id}': {
      get: { tags: ['Projects'], summary: 'Get a project', security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
      patch: { tags: ['Projects'], summary: 'Update a project', security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
      delete: { tags: ['Projects'], summary: 'Delete a project (owner only)', security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Deleted' } } },
    },
    '/projects/{id}/members': {
      post: {
        tags: ['Projects'],
        summary: 'Add a member by email (owner only)',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string' } } } } },
        },
        responses: { '201': { description: 'Member added' } },
      },
    },
    '/projects/{projectId}/tasks': {
      get: { tags: ['Tasks'], summary: 'List tasks in a project', security: bearer, parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'OK' } } },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task',
        security: bearer,
        parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', example: 'Design login page' },
                  description: { type: 'string' },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
                  assigneeId: { type: 'string' },
                  dueDate: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created (also emits task:created over WebSocket)' } },
      },
    },
    '/tasks/{id}': {
      patch: {
        tags: ['Tasks'],
        summary: 'Update a task (status, assignee, etc.)',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
                  assigneeId: { type: 'string', nullable: true },
                  dueDate: { type: 'string', format: 'date-time', nullable: true },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated (also emits task:updated)' } },
      },
      delete: { tags: ['Tasks'], summary: 'Delete a task', security: bearer, parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '204': { description: 'Deleted' } } },
    },
    '/search': {
      get: {
        tags: ['Search'],
        summary: 'Full-text search across your tasks',
        security: bearer,
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' }, example: 'login' }],
        responses: { '200': { description: 'Ranked results' } },
      },
    },
    '/projects/{projectId}/summary': {
      post: {
        tags: ['AI'],
        summary: 'Generate an AI status summary (cached in Redis)',
        security: bearer,
        parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Summary text + cached flag' } },
      },
    },
  },
};
