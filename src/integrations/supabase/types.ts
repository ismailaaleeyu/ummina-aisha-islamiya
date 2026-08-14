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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applicants: {
        Row: {
          address: string | null
          application_date: string
          application_no: string
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          decision_notes: string | null
          desired_class_id: string | null
          full_name: string
          gender: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          notes: string | null
          previous_school: string | null
          status: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          application_date?: string
          application_no: string
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          decision_notes?: string | null
          desired_class_id?: string | null
          full_name: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          notes?: string | null
          previous_school?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          application_date?: string
          application_no?: string
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          decision_notes?: string | null
          desired_class_id?: string | null
          full_name?: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          notes?: string | null
          previous_school?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicants_desired_class_id_fkey"
            columns: ["desired_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string | null
          created_at: string
          date: string
          id: string
          note: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      book_loans: {
        Row: {
          book_id: string
          borrowed_at: string
          created_at: string
          due_date: string | null
          id: string
          issued_by: string | null
          notes: string | null
          returned_at: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          book_id: string
          borrowed_at?: string
          created_at?: string
          due_date?: string | null
          id?: string
          issued_by?: string | null
          notes?: string | null
          returned_at?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          borrowed_at?: string
          created_at?: string
          due_date?: string | null
          id?: string
          issued_by?: string | null
          notes?: string | null
          returned_at?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_loans_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_loans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string | null
          available_copies: number
          category: string | null
          created_at: string
          id: string
          isbn: string | null
          publisher: string | null
          shelf_location: string | null
          title: string
          total_copies: number
          updated_at: string
        }
        Insert: {
          author?: string | null
          available_copies?: number
          category?: string | null
          created_at?: string
          id?: string
          isbn?: string | null
          publisher?: string | null
          shelf_location?: string | null
          title: string
          total_copies?: number
          updated_at?: string
        }
        Update: {
          author?: string | null
          available_copies?: number
          category?: string | null
          created_at?: string
          id?: string
          isbn?: string | null
          publisher?: string | null
          shelf_location?: string | null
          title?: string
          total_copies?: number
          updated_at?: string
        }
        Relationships: []
      }
      branding: {
        Row: {
          accent_color: string
          id: boolean
          logo_url: string | null
          primary_color: string
          school_name: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string
          id?: boolean
          logo_url?: string | null
          primary_color?: string
          school_name: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string
          id?: boolean
          logo_url?: string | null
          primary_color?: string
          school_name?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      classes: {
        Row: {
          created_at: string
          id: string
          level: string | null
          name: string
          section: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string | null
          name: string
          section?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string | null
          name?: string
          section?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      exam_scores: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          max_score: number
          recorded_by: string | null
          remarks: string | null
          score: number
          student_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          max_score?: number
          recorded_by?: string | null
          remarks?: string | null
          score?: number
          student_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          max_score?: number
          recorded_by?: string | null
          remarks?: string | null
          score?: number
          student_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_scores_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_scores_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          academic_year: string | null
          class_id: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          term: string | null
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          term?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          term?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          amount: number
          class_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          session: string | null
          term: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          class_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          session?: string | null
          term?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          class_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          session?: string | null
          term?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          amount_paid: number
          created_at: string
          due_date: string | null
          fee_structure_id: string | null
          id: string
          issued_by: string | null
          notes: string | null
          session: string | null
          status: string
          student_id: string
          term: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          amount_paid?: number
          created_at?: string
          due_date?: string | null
          fee_structure_id?: string | null
          id?: string
          issued_by?: string | null
          notes?: string | null
          session?: string | null
          status?: string
          student_id: string
          term?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          due_date?: string | null
          fee_structure_id?: string | null
          id?: string
          issued_by?: string | null
          notes?: string | null
          session?: string | null
          status?: string
          student_id?: string
          term?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          requested_at: string
          staff_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          requested_at?: string
          staff_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          requested_at?: string
          staff_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          audience: Database["public"]["Enums"]["app_role"][]
          body: string
          category: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          pinned: boolean
          priority: string
          publish_at: string
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["app_role"][]
          body: string
          category?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          pinned?: boolean
          priority?: string
          publish_at?: string
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["app_role"][]
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          pinned?: boolean
          priority?: string
          publish_at?: string
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_id: string
          metadata: Json | null
          paid_at: string | null
          payer_email: string | null
          provider: string
          reference: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id: string
          metadata?: Json | null
          paid_at?: string | null
          payer_email?: string | null
          provider?: string
          reference: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string
          metadata?: Json | null
          paid_at?: string | null
          payer_email?: string | null
          provider?: string
          reference?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      periods: {
        Row: {
          created_at: string
          end_time: string
          id: string
          name: string
          sort_order: number
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          name: string
          sort_order?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          name?: string
          sort_order?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      route_stops: {
        Row: {
          created_at: string
          id: string
          name: string
          pickup_time: string | null
          route_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pickup_time?: string | null
          route_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pickup_time?: string | null
          route_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "transport_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          department: string | null
          designation: string | null
          email: string | null
          full_name: string
          hire_date: string | null
          id: string
          notes: string | null
          phone: string | null
          staff_no: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          staff_no: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          staff_no?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      student_transport: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          route_id: string
          start_date: string
          status: string
          stop_id: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          route_id: string
          start_date?: string
          status?: string
          stop_id?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          route_id?: string
          start_date?: string
          status?: string
          stop_id?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_transport_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "transport_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transport_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transport_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_no: string
          class_id: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string
          gender: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          admission_no: string
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          admission_no?: string
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class_id: string | null
          code: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          hire_date: string | null
          id: string
          notes: string | null
          phone: string | null
          qualifications: string | null
          specialization: string | null
          staff_no: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          qualifications?: string | null
          specialization?: string | null
          staff_no: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          qualifications?: string | null
          specialization?: string | null
          staff_no?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      timetable_slots: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          id: string
          period_id: string
          room: string | null
          subject_id: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          id?: string
          period_id: string
          room?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          id?: string
          period_id?: string
          room?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_routes: {
        Row: {
          created_at: string
          description: string | null
          fare_per_term: number
          id: string
          name: string
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          fare_per_term?: number
          id?: string
          name: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          fare_per_term?: number
          id?: string
          name?: string
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_routes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          capacity: number
          created_at: string
          driver_name: string | null
          driver_phone: string | null
          id: string
          model: string | null
          notes: string | null
          plate_number: string
          status: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          plate_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          model?: string | null
          notes?: string | null
          plate_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role:
        | "admin"
        | "teacher"
        | "student"
        | "parent"
        | "accountant"
        | "librarian"
        | "hr"
        | "receptionist"
        | "transport_manager"
      attendance_status: "present" | "absent" | "late" | "excused"
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
  public: {
    Enums: {
      app_role: [
        "admin",
        "teacher",
        "student",
        "parent",
        "accountant",
        "librarian",
        "hr",
        "receptionist",
        "transport_manager",
      ],
      attendance_status: ["present", "absent", "late", "excused"],
    },
  },
} as const
