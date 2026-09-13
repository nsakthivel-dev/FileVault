import { z } from 'zod';
import { 
  insertUserSchema, 
  createDocumentSchema, 
  updateDocumentSchema, 
  createShareSchema,
  DocumentRecord,
  UserRecord,
  ShareRecord,
  AuditLogRecord,
  NotificationRecord,
  PublicVerificationResponse
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string()
  }),
  forbidden: z.object({
    message: z.string()
  })
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register' as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<UserRecord>(),
        400: errorSchemas.validation,
      }
    },
    login: {
      method: 'POST' as const,
      path: '/api/login' as const,
      input: insertUserSchema,
      responses: {
        200: z.custom<UserRecord>(),
        401: errorSchemas.unauthorized,
      }
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout' as const,
      responses: {
        200: z.object({ message: z.string() })
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/user' as const,
      responses: {
        200: z.custom<UserRecord>(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  documents: {
    list: {
      method: 'GET' as const,
      path: '/api/documents' as const,
      responses: {
        200: z.array(z.custom<DocumentRecord>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/documents/:id' as const,
      responses: {
        200: z.custom<DocumentRecord>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    upload: {
      method: 'POST' as const,
      path: '/api/documents' as const,
      responses: {
        201: z.custom<DocumentRecord>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/documents/:id' as const,
      input: updateDocumentSchema,
      responses: {
        200: z.custom<DocumentRecord>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/documents/:id' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    download: {
      method: 'GET' as const,
      path: '/api/documents/:id/download' as const,
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    },
    preview: {
      method: 'GET' as const,
      path: '/api/documents/:id/preview' as const,
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    },
    reprocess: {
      method: 'POST' as const,
      path: '/api/documents/:id/reprocess' as const,
      responses: {
        200: z.custom<DocumentRecord>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    },
    review: {
      method: 'POST' as const,
      path: '/api/documents/:id/review' as const,
      responses: {
        200: z.custom<DocumentRecord>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    },
    resolveDuplicate: {
      method: 'POST' as const,
      path: '/api/documents/:id/resolve-duplicate' as const,
      responses: {
        200: z.custom<DocumentRecord>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    },
    pin: {
      method: 'POST' as const,
      path: '/api/documents/:id/pin' as const,
      responses: {
        200: z.custom<DocumentRecord>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    }
  },
  shares: {
    list: {
      method: 'GET' as const,
      path: '/api/shares' as const,
      responses: {
        200: z.array(z.custom<ShareRecord>()),
        401: errorSchemas.unauthorized,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/shares' as const,
      input: createShareSchema,
      responses: {
        201: z.custom<ShareRecord>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    },
    listForDocument: {
      method: 'GET' as const,
      path: '/api/shares/document/:documentId' as const,
      responses: {
        200: z.array(z.custom<ShareRecord>()),
        401: errorSchemas.unauthorized,
      }
    },
    revoke: {
      method: 'DELETE' as const,
      path: '/api/shares/:id' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    },
    preview: {
      method: 'GET' as const,
      path: '/api/shares/:id/preview' as const,
      responses: {
        200: z.any(),
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      }
    },
    download: {
      method: 'GET' as const,
      path: '/api/shares/:id/download' as const,
      responses: {
        200: z.any(),
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      }
    }
  },
  trash: {
    list: {
      method: 'GET' as const,
      path: '/api/trash' as const,
      responses: {
        200: z.array(z.custom<DocumentRecord & { daysRemaining: number }>()),
        401: errorSchemas.unauthorized,
      }
    },
    restore: {
      method: 'POST' as const,
      path: '/api/documents/:id/restore' as const,
      responses: {
        200: z.custom<DocumentRecord>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    },
    permanentDelete: {
      method: 'DELETE' as const,
      path: '/api/documents/:id/permanent' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      }
    },
    empty: {
      method: 'DELETE' as const,
      path: '/api/trash/empty' as const,
      responses: {
        200: z.object({ deletedCount: z.number() }),
        401: errorSchemas.unauthorized,
      }
    }
  },
  verification: {
    get: {
      method: 'GET' as const,
      path: '/api/verify/:shareId' as const,
      responses: {
        200: z.custom<PublicVerificationResponse>(),
        404: errorSchemas.notFound,
      }
    }
  },
  auditLogs: {
    list: {
      method: 'GET' as const,
      path: '/api/audit-logs' as const,
      responses: {
        200: z.array(z.custom<AuditLogRecord>()),
        401: errorSchemas.unauthorized,
      }
    }
  },
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/dashboard/stats' as const,
      responses: {
        200: z.object({
          totalDocuments: z.number(),
          totalCertificates: z.number(),
          totalIdentity: z.number(),
          expiringSoon: z.number(),
          verifiedDocuments: z.number(),
          sharedDocuments: z.number(),
          totalStorageBytes: z.number(),
        }),
        401: errorSchemas.unauthorized,
      }
    }
  },
  notifications: {
    list: {
      method: 'GET' as const,
      path: '/api/notifications' as const,
      responses: {
        200: z.array(z.custom<NotificationRecord>()),
        401: errorSchemas.unauthorized,
      }
    },
    markRead: {
      method: 'POST' as const,
      path: '/api/notifications/:id/read' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
