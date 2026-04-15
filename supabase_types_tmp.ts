export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      chat_grupo_miembros: {
        Row: {
          grupo_id: string
          usuario_id: string
        }
        Insert: {
          grupo_id: string
          usuario_id: string
        }
        Update: {
          grupo_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_grupo_miembros_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "chat_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_grupo_miembros_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_grupos: {
        Row: {
          creado_por: string | null
          created_at: string | null
          id: string
          nombre: string
        }
        Insert: {
          creado_por?: string | null
          created_at?: string | null
          id?: string
          nombre: string
        }
        Update: {
          creado_por?: string | null
          created_at?: string | null
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_grupos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_silenciados: {
        Row: {
          proyecto_id: string
          usuario_id: string
        }
        Insert: {
          proyecto_id: string
          usuario_id: string
        }
        Update: {
          proyecto_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_silenciados_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_silenciados_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios_muro: {
        Row: {
          contenido: string
          creado_at: string
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          contenido: string
          creado_at?: string
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          contenido?: string
          creado_at?: string
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_muro_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "muro_social"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_muro_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departamentos: {
        Row: {
          creado_en: string
          id: string
          nombre: string
        }
        Insert: {
          creado_en?: string
          id?: string
          nombre: string
        }
        Update: {
          creado_en?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      inventario_catalogo: {
        Row: {
          categoria: string
          created_at: string | null
          id: string
          nombre: string
          sku: string
          stock_actual: number | null
          stock_minimo: number | null
          unidad_medida: string | null
        }
        Insert: {
          categoria: string
          created_at?: string | null
          id?: string
          nombre: string
          sku: string
          stock_actual?: number | null
          stock_minimo?: number | null
          unidad_medida?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string | null
          id?: string
          nombre?: string
          sku?: string
          stock_actual?: number | null
          stock_minimo?: number | null
          unidad_medida?: string | null
        }
        Relationships: []
      }
      inventario_movimientos: {
        Row: {
          cantidad: number
          catalogo_id: string | null
          created_at: string | null
          detalles: Json | null
          id: string
          referencia: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          cantidad: number
          catalogo_id?: string | null
          created_at?: string | null
          detalles?: Json | null
          id?: string
          referencia?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          cantidad?: number
          catalogo_id?: string | null
          created_at?: string | null
          detalles?: Json | null
          id?: string
          referencia?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_movimientos_catalogo_id_fkey"
            columns: ["catalogo_id"]
            isOneToOne: false
            referencedRelation: "inventario_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_responsivas: {
        Row: {
          asignado_a: string | null
          created_at: string | null
          entregado_por: string | null
          estatus: string | null
          fecha_devolucion: string | null
          fecha_entrega: string | null
          fotos_entrega: Json | null
          id: string
          serie_id: string | null
        }
        Insert: {
          asignado_a?: string | null
          created_at?: string | null
          entregado_por?: string | null
          estatus?: string | null
          fecha_devolucion?: string | null
          fecha_entrega?: string | null
          fotos_entrega?: Json | null
          id?: string
          serie_id?: string | null
        }
        Update: {
          asignado_a?: string | null
          created_at?: string | null
          entregado_por?: string | null
          estatus?: string | null
          fecha_devolucion?: string | null
          fecha_entrega?: string | null
          fotos_entrega?: Json | null
          id?: string
          serie_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_responsivas_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_responsivas_entregado_por_fkey"
            columns: ["entregado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_responsivas_serie_id_fkey"
            columns: ["serie_id"]
            isOneToOne: false
            referencedRelation: "inventario_series"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_series: {
        Row: {
          catalogo_id: string | null
          created_at: string | null
          estatus: string | null
          id: string
          numero_serie: string
          proyecto_id: string | null
        }
        Insert: {
          catalogo_id?: string | null
          created_at?: string | null
          estatus?: string | null
          id?: string
          numero_serie: string
          proyecto_id?: string | null
        }
        Update: {
          catalogo_id?: string | null
          created_at?: string | null
          estatus?: string | null
          id?: string
          numero_serie?: string
          proyecto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_series_catalogo_id_fkey"
            columns: ["catalogo_id"]
            isOneToOne: false
            referencedRelation: "inventario_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_series_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      likes_muro: {
        Row: {
          post_id: string
          user_id: string
        }
        Insert: {
          post_id: string
          user_id: string
        }
        Update: {
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_muro_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "muro_social"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_muro_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes_chat: {
        Row: {
          archivo_nombre: string | null
          archivo_tipo: string | null
          archivo_url: string | null
          created_at: string | null
          destinatario_id: string | null
          estatus_proyecto: string | null
          grupo_id: string | null
          id: string
          is_edited: boolean | null
          is_pinned: boolean | null
          likes: string[] | null
          mensaje: string
          mensaje_citado_id: string | null
          proyecto_id: string | null
          reacciones: Json | null
          remitente_id: string
          visto_por: string[] | null
        }
        Insert: {
          archivo_nombre?: string | null
          archivo_tipo?: string | null
          archivo_url?: string | null
          created_at?: string | null
          destinatario_id?: string | null
          estatus_proyecto?: string | null
          grupo_id?: string | null
          id?: string
          is_edited?: boolean | null
          is_pinned?: boolean | null
          likes?: string[] | null
          mensaje: string
          mensaje_citado_id?: string | null
          proyecto_id?: string | null
          reacciones?: Json | null
          remitente_id: string
          visto_por?: string[] | null
        }
        Update: {
          archivo_nombre?: string | null
          archivo_tipo?: string | null
          archivo_url?: string | null
          created_at?: string | null
          destinatario_id?: string | null
          estatus_proyecto?: string | null
          grupo_id?: string | null
          id?: string
          is_edited?: boolean | null
          is_pinned?: boolean | null
          likes?: string[] | null
          mensaje?: string
          mensaje_citado_id?: string | null
          proyecto_id?: string | null
          reacciones?: Json | null
          remitente_id?: string
          visto_por?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_chat_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_chat_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "chat_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_chat_mensaje_citado_id_fkey"
            columns: ["mensaje_citado_id"]
            isOneToOne: false
            referencedRelation: "mensajes_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_chat_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensajes_chat_remitente_id_fkey"
            columns: ["remitente_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      muro_social: {
        Row: {
          comments_count: number | null
          contenido: string | null
          creado_at: string
          fijado: boolean | null
          id: string
          imagen_url: string | null
          likes_count: number | null
          opciones: Json | null
          tipo: string | null
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          contenido?: string | null
          creado_at?: string
          fijado?: boolean | null
          id?: string
          imagen_url?: string | null
          likes_count?: number | null
          opciones?: Json | null
          tipo?: string | null
          user_id: string
        }
        Update: {
          comments_count?: number | null
          contenido?: string | null
          creado_at?: string
          fijado?: boolean | null
          id?: string
          imagen_url?: string | null
          likes_count?: number | null
          opciones?: Json | null
          tipo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "muro_social_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          autor_id: string | null
          creado_at: string
          id: string
          leida: boolean | null
          mensaje: string
          usuario_id: string
        }
        Insert: {
          autor_id?: string | null
          creado_at?: string
          id?: string
          leida?: boolean | null
          mensaje: string
          usuario_id: string
        }
        Update: {
          autor_id?: string | null
          creado_at?: string
          id?: string
          leida?: boolean | null
          mensaje?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          actualizado_en: string | null
          administrador_pagos: boolean | null
          agendar_viabilidad: boolean | null
          apellidos: string
          auth_user_id: string | null
          avatar_url: string | null
          comision_base: number | null
          comunicados: boolean | null
          cotizaciones: boolean | null
          creado_en: string
          creado_por: string | null
          curp: string | null
          departamento: string | null
          dias_vacaciones_disponibles: number | null
          direccion: string | null
          doc_acta: string | null
          doc_csf: string | null
          doc_domicilio: string | null
          doc_ine: string | null
          email_corporativo: string
          email_personal: string | null
          estado_actual: Database["public"]["Enums"]["estado_empleado"] | null
          fecha_ingreso: string
          fecha_nacimiento: string | null
          fin_proximas_vacaciones: string | null
          finanzas: boolean | null
          fotografia_url: string | null
          historial_puestos: Json | null
          id: string
          ingenieria: boolean | null
          inicio_proximas_vacaciones: string | null
          instalacion: boolean | null
          interconexion: boolean | null
          inventario: boolean | null
          jefe_id: string | null
          meta_mensual_ventas: number | null
          nombre: string
          notif_cotizaciones: boolean | null
          notif_finanzas: boolean | null
          notif_instalacion: boolean | null
          notif_interconexion: boolean | null
          notif_inventario: boolean | null
          notif_revision: boolean | null
          notif_viabilidad_revision: boolean | null
          notif_viabilidad_tecnica: boolean | null
          numero_empleado: string | null
          panel: boolean | null
          permisos_especificos: Json | null
          proyectos: boolean | null
          puesto_actual: string | null
          revision_cotizaciones: boolean | null
          rfc: string | null
          rol_sistema: string | null
          sucursal_asignada: string | null
          telefono_emergencia: string | null
          telefono_movil: string | null
          ultima_conexion: string | null
          ultimo_acceso: string | null
          usuarios: boolean | null
          ventas: boolean | null
          zona_cobertura: string | null
        }
        Insert: {
          actualizado_en?: string | null
          administrador_pagos?: boolean | null
          agendar_viabilidad?: boolean | null
          apellidos: string
          auth_user_id?: string | null
          avatar_url?: string | null
          comision_base?: number | null
          comunicados?: boolean | null
          cotizaciones?: boolean | null
          creado_en?: string
          creado_por?: string | null
          curp?: string | null
          departamento?: string | null
          dias_vacaciones_disponibles?: number | null
          direccion?: string | null
          doc_acta?: string | null
          doc_csf?: string | null
          doc_domicilio?: string | null
          doc_ine?: string | null
          email_corporativo: string
          email_personal?: string | null
          estado_actual?: Database["public"]["Enums"]["estado_empleado"] | null
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          fin_proximas_vacaciones?: string | null
          finanzas?: boolean | null
          fotografia_url?: string | null
          historial_puestos?: Json | null
          id?: string
          ingenieria?: boolean | null
          inicio_proximas_vacaciones?: string | null
          instalacion?: boolean | null
          interconexion?: boolean | null
          inventario?: boolean | null
          jefe_id?: string | null
          meta_mensual_ventas?: number | null
          nombre: string
          notif_cotizaciones?: boolean | null
          notif_finanzas?: boolean | null
          notif_instalacion?: boolean | null
          notif_interconexion?: boolean | null
          notif_inventario?: boolean | null
          notif_revision?: boolean | null
          notif_viabilidad_revision?: boolean | null
          notif_viabilidad_tecnica?: boolean | null
          numero_empleado?: string | null
          panel?: boolean | null
          permisos_especificos?: Json | null
          proyectos?: boolean | null
          puesto_actual?: string | null
          revision_cotizaciones?: boolean | null
          rfc?: string | null
          rol_sistema?: string | null
          sucursal_asignada?: string | null
          telefono_emergencia?: string | null
          telefono_movil?: string | null
          ultima_conexion?: string | null
          ultimo_acceso?: string | null
          usuarios?: boolean | null
          ventas?: boolean | null
          zona_cobertura?: string | null
        }
        Update: {
          actualizado_en?: string | null
          administrador_pagos?: boolean | null
          agendar_viabilidad?: boolean | null
          apellidos?: string
          auth_user_id?: string | null
          avatar_url?: string | null
          comision_base?: number | null
          comunicados?: boolean | null
          cotizaciones?: boolean | null
          creado_en?: string
          creado_por?: string | null
          curp?: string | null
          departamento?: string | null
          dias_vacaciones_disponibles?: number | null
          direccion?: string | null
          doc_acta?: string | null
          doc_csf?: string | null
          doc_domicilio?: string | null
          doc_ine?: string | null
          email_corporativo?: string
          email_personal?: string | null
          estado_actual?: Database["public"]["Enums"]["estado_empleado"] | null
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          fin_proximas_vacaciones?: string | null
          finanzas?: boolean | null
          fotografia_url?: string | null
          historial_puestos?: Json | null
          id?: string
          ingenieria?: boolean | null
          inicio_proximas_vacaciones?: string | null
          instalacion?: boolean | null
          interconexion?: boolean | null
          inventario?: boolean | null
          jefe_id?: string | null
          meta_mensual_ventas?: number | null
          nombre?: string
          notif_cotizaciones?: boolean | null
          notif_finanzas?: boolean | null
          notif_instalacion?: boolean | null
          notif_interconexion?: boolean | null
          notif_inventario?: boolean | null
          notif_revision?: boolean | null
          notif_viabilidad_revision?: boolean | null
          notif_viabilidad_tecnica?: boolean | null
          numero_empleado?: string | null
          panel?: boolean | null
          permisos_especificos?: Json | null
          proyectos?: boolean | null
          puesto_actual?: string | null
          revision_cotizaciones?: boolean | null
          rfc?: string | null
          rol_sistema?: string | null
          sucursal_asignada?: string | null
          telefono_emergencia?: string | null
          telefono_movil?: string | null
          ultima_conexion?: string | null
          ultimo_acceso?: string | null
          usuarios?: boolean | null
          ventas?: boolean | null
          zona_cobertura?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfiles_jefe_id_fkey"
            columns: ["jefe_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proyectos: {
        Row: {
          archivo_url: string | null
          archivos_adjuntos: Json | null
          archivos_cotizacion: Json | null
          calle: string | null
          ciudad: string | null
          codigo_postal: string | null
          colonia: string | null
          comentarios_iniciales: string | null
          comentarios_solicitud: string | null
          created_at: string | null
          estado_dir: string | null
          estatus: string | null
          fachada_url: string | null
          fecha_aprobacion_cotizacion: string | null
          fecha_aprobacion_recotizacion: string | null
          fecha_confirmacion_viabilidad: string | null
          fecha_cotizado: string | null
          fecha_creacion_solicitud: string | null
          fecha_fin_ingenieria: string | null
          fecha_fin_proceso_cotizacion: string | null
          fecha_fin_revision: string | null
          fecha_fin_viabilidad: string | null
          fecha_inicio_cotizacion: string | null
          fecha_inicio_ingenieria: string | null
          fecha_inicio_recotizacion: string | null
          fecha_inicio_revision: string | null
          fecha_inicio_viabilidad: string | null
          fecha_recotizacion: string | null
          fecha_recotizado: string | null
          fecha_revision: string | null
          fecha_viabilidad_agendada: string | null
          fecha_viabilidad_solicitada: string | null
          giro_proyecto: string | null
          id: string
          id_referencia: number | null
          ingeniero_recotizador_id: string | null
          link_maps: string | null
          nombre_cliente: string | null
          nombre_proyecto: string
          numero_cliente: string | null
          origen_cotizacion: string | null
          requiere_escalera: boolean | null
          sub_estatus: string | null
          updated_at: string | null
          usuario_aprobo_cotizacion_id: string | null
          usuario_inicio_viabilidad_id: string | null
          vendedor_id: string | null
          vendedor_telefono: string | null
        }
        Insert: {
          archivo_url?: string | null
          archivos_adjuntos?: Json | null
          archivos_cotizacion?: Json | null
          calle?: string | null
          ciudad?: string | null
          codigo_postal?: string | null
          colonia?: string | null
          comentarios_iniciales?: string | null
          comentarios_solicitud?: string | null
          created_at?: string | null
          estado_dir?: string | null
          estatus?: string | null
          fachada_url?: string | null
          fecha_aprobacion_cotizacion?: string | null
          fecha_aprobacion_recotizacion?: string | null
          fecha_confirmacion_viabilidad?: string | null
          fecha_cotizado?: string | null
          fecha_creacion_solicitud?: string | null
          fecha_fin_ingenieria?: string | null
          fecha_fin_proceso_cotizacion?: string | null
          fecha_fin_revision?: string | null
          fecha_fin_viabilidad?: string | null
          fecha_inicio_cotizacion?: string | null
          fecha_inicio_ingenieria?: string | null
          fecha_inicio_recotizacion?: string | null
          fecha_inicio_revision?: string | null
          fecha_inicio_viabilidad?: string | null
          fecha_recotizacion?: string | null
          fecha_recotizado?: string | null
          fecha_revision?: string | null
          fecha_viabilidad_agendada?: string | null
          fecha_viabilidad_solicitada?: string | null
          giro_proyecto?: string | null
          id?: string
          id_referencia?: number | null
          ingeniero_recotizador_id?: string | null
          link_maps?: string | null
          nombre_cliente?: string | null
          nombre_proyecto: string
          numero_cliente?: string | null
          origen_cotizacion?: string | null
          requiere_escalera?: boolean | null
          sub_estatus?: string | null
          updated_at?: string | null
          usuario_aprobo_cotizacion_id?: string | null
          usuario_inicio_viabilidad_id?: string | null
          vendedor_id?: string | null
          vendedor_telefono?: string | null
        }
        Update: {
          archivo_url?: string | null
          archivos_adjuntos?: Json | null
          archivos_cotizacion?: Json | null
          calle?: string | null
          ciudad?: string | null
          codigo_postal?: string | null
          colonia?: string | null
          comentarios_iniciales?: string | null
          comentarios_solicitud?: string | null
          created_at?: string | null
          estado_dir?: string | null
          estatus?: string | null
          fachada_url?: string | null
          fecha_aprobacion_cotizacion?: string | null
          fecha_aprobacion_recotizacion?: string | null
          fecha_confirmacion_viabilidad?: string | null
          fecha_cotizado?: string | null
          fecha_creacion_solicitud?: string | null
          fecha_fin_ingenieria?: string | null
          fecha_fin_proceso_cotizacion?: string | null
          fecha_fin_revision?: string | null
          fecha_fin_viabilidad?: string | null
          fecha_inicio_cotizacion?: string | null
          fecha_inicio_ingenieria?: string | null
          fecha_inicio_recotizacion?: string | null
          fecha_inicio_revision?: string | null
          fecha_inicio_viabilidad?: string | null
          fecha_recotizacion?: string | null
          fecha_recotizado?: string | null
          fecha_revision?: string | null
          fecha_viabilidad_agendada?: string | null
          fecha_viabilidad_solicitada?: string | null
          giro_proyecto?: string | null
          id?: string
          id_referencia?: number | null
          ingeniero_recotizador_id?: string | null
          link_maps?: string | null
          nombre_cliente?: string | null
          nombre_proyecto?: string
          numero_cliente?: string | null
          origen_cotizacion?: string | null
          requiere_escalera?: boolean | null
          sub_estatus?: string | null
          updated_at?: string | null
          usuario_aprobo_cotizacion_id?: string | null
          usuario_inicio_viabilidad_id?: string | null
          vendedor_id?: string | null
          vendedor_telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_ingeniero_recotizador_id_fkey"
            columns: ["ingeniero_recotizador_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proyectos_interacciones: {
        Row: {
          accion: string | null
          created_at: string | null
          estado_anterior: string | null
          estado_nuevo: string | null
          id: number
          mensaje: string | null
          proyecto_id: string | null
          usuario_id: string | null
        }
        Insert: {
          accion?: string | null
          created_at?: string | null
          estado_anterior?: string | null
          estado_nuevo?: string | null
          id?: number
          mensaje?: string | null
          proyecto_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          accion?: string | null
          created_at?: string | null
          estado_anterior?: string | null
          estado_nuevo?: string | null
          id?: number
          mensaje?: string | null
          proyecto_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_interacciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_interacciones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          endpoint: string
          id: number
          subscription_json: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: number
          subscription_json: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: number
          subscription_json?: Json
          user_id?: string
        }
        Relationships: []
      }
      roles_sistema: {
        Row: {
          creado_en: string
          id: string
          nombre: string
        }
        Insert: {
          creado_en?: string
          id?: string
          nombre: string
        }
        Update: {
          creado_en?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      solicitudes_ausencia: {
        Row: {
          creado_at: string
          dias_solicitados: number
          estado: string | null
          fecha_fin: string
          fecha_inicio: string
          id: string
          motivo: string | null
          revisado_por: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          creado_at?: string
          dias_solicitados: number
          estado?: string | null
          fecha_fin: string
          fecha_inicio: string
          id?: string
          motivo?: string | null
          revisado_por?: string | null
          tipo?: string
          user_id: string
        }
        Update: {
          creado_at?: string
          dias_solicitados?: number
          estado?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          motivo?: string | null
          revisado_por?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_ausencia_revisado_por_fkey"
            columns: ["revisado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_ausencia_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      viabilidad_control: {
        Row: {
          agenda_fecha: string | null
          agenda_hora_inicio: string | null
          comentarios_cancelacion: string | null
          comentarios_ingenieria: string | null
          comentarios_revision_gerencia: string | null
          comentarios_revision_ingenieria: string | null
          created_at: string | null
          fecha_agendada: string | null
          fecha_agendada_fin: string | null
          fecha_revisada_ingenieria: string | null
          fecha_revisada_ventas: string | null
          fecha_solicitada: string | null
          fecha_terminada: string | null
          fecha_verificada: string | null
          hora_agendada_fin: string | null
          hora_agendada_inicio: string | null
          id: string
          ingeniero_id: string | null
          proyecto_id: string | null
          status: number
        }
        Insert: {
          agenda_fecha?: string | null
          agenda_hora_inicio?: string | null
          comentarios_cancelacion?: string | null
          comentarios_ingenieria?: string | null
          comentarios_revision_gerencia?: string | null
          comentarios_revision_ingenieria?: string | null
          created_at?: string | null
          fecha_agendada?: string | null
          fecha_agendada_fin?: string | null
          fecha_revisada_ingenieria?: string | null
          fecha_revisada_ventas?: string | null
          fecha_solicitada?: string | null
          fecha_terminada?: string | null
          fecha_verificada?: string | null
          hora_agendada_fin?: string | null
          hora_agendada_inicio?: string | null
          id?: string
          ingeniero_id?: string | null
          proyecto_id?: string | null
          status?: number
        }
        Update: {
          agenda_fecha?: string | null
          agenda_hora_inicio?: string | null
          comentarios_cancelacion?: string | null
          comentarios_ingenieria?: string | null
          comentarios_revision_gerencia?: string | null
          comentarios_revision_ingenieria?: string | null
          created_at?: string | null
          fecha_agendada?: string | null
          fecha_agendada_fin?: string | null
          fecha_revisada_ingenieria?: string | null
          fecha_revisada_ventas?: string | null
          fecha_solicitada?: string | null
          fecha_terminada?: string | null
          fecha_verificada?: string | null
          hora_agendada_fin?: string | null
          hora_agendada_inicio?: string | null
          id?: string
          ingeniero_id?: string | null
          proyecto_id?: string | null
          status?: number
        }
        Relationships: [
          {
            foreignKeyName: "viabilidad_control_ingeniero_id_fkey"
            columns: ["ingeniero_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viabilidad_control_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      votos_encuesta: {
        Row: {
          opcion_index: number
          post_id: string
          user_id: string
        }
        Insert: {
          opcion_index: number
          post_id: string
          user_id: string
        }
        Update: {
          opcion_index?: number
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votos_encuesta_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "muro_social"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votos_encuesta_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      departamento_empresa:
        | "direccion"
        | "ventas"
        | "recursos_humanos"
        | "sistemas"
        | "marketing"
        | "finanzas"
        | "operaciones"
        | "legal"
      estado_empleado:
        | "activo"
        | "inactivo"
        | "vacaciones"
        | "incapacidad"
        | "permiso_sin_goce"
        | "baja"
      rol_sistema:
        | "superadmin"
        | "director"
        | "gerente"
        | "coordinador"
        | "asesor"
        | "auditor"
        | "rh"
        | "marketing"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      departamento_empresa: [
        "direccion",
        "ventas",
        "recursos_humanos",
        "sistemas",
        "marketing",
        "finanzas",
        "operaciones",
        "legal",
      ],
      estado_empleado: [
        "activo",
        "inactivo",
        "vacaciones",
        "incapacidad",
        "permiso_sin_goce",
        "baja",
      ],
      rol_sistema: [
        "superadmin",
        "director",
        "gerente",
        "coordinador",
        "asesor",
        "auditor",
        "rh",
        "marketing",
      ],
    },
  },
} as const
