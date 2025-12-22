-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.USER (
  UserID integer NOT NULL DEFAULT nextval('"USER_UserID_seq"'::regclass),
  Username character varying NOT NULL UNIQUE,
  Email character varying NOT NULL,
  XP integer DEFAULT 0 CHECK ("XP" >= 0),
  Level integer DEFAULT 1 CHECK ("Level" >= 1),
  CreatedAt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  Password character varying,
  CONSTRAINT USER_pkey PRIMARY KEY (UserID)
);
CREATE TABLE public.achievement (
  AchievementID integer NOT NULL DEFAULT nextval('"achievement_AchievementID_seq"'::regclass),
  Name character varying NOT NULL,
  Description text,
  CriteriaType character varying,
  CONSTRAINT achievement_pkey PRIMARY KEY (AchievementID)
);
CREATE TABLE public.course (
  CourseID integer NOT NULL DEFAULT nextval('"course_CourseID_seq"'::regclass),
  Title character varying NOT NULL,
  Description text,
  CreatorID integer NOT NULL,
  Status character varying DEFAULT 'draft'::character varying CHECK ("Status"::text = ANY (ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying]::text[])),
  TotalNodes integer DEFAULT 0 CHECK ("TotalNodes" >= 0),
  CreatedAt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT course_pkey PRIMARY KEY (CourseID),
  CONSTRAINT course_CreatorID_fkey FOREIGN KEY (CreatorID) REFERENCES public.USER(UserID)
);
CREATE TABLE public.course_tag (
  CourseID integer NOT NULL,
  TagID integer NOT NULL,
  CONSTRAINT course_tag_pkey PRIMARY KEY (CourseID, TagID),
  CONSTRAINT course_tag_CourseID_fkey FOREIGN KEY (CourseID) REFERENCES public.course(CourseID),
  CONSTRAINT course_tag_TagID_fkey FOREIGN KEY (TagID) REFERENCES public.tag(TagID)
);
CREATE TABLE public.courserating (
  RatingID integer NOT NULL DEFAULT nextval('"courserating_RatingID_seq"'::regclass),
  CourseID integer NOT NULL,
  UserID integer NOT NULL,
  RatingScore integer CHECK ("RatingScore" >= 1 AND "RatingScore" <= 5),
  Comment text,
  ReviewedAt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT courserating_pkey PRIMARY KEY (RatingID),
  CONSTRAINT courserating_UserID_fkey FOREIGN KEY (UserID) REFERENCES public.USER(UserID),
  CONSTRAINT courserating_CourseID_fkey FOREIGN KEY (CourseID) REFERENCES public.course(CourseID)
);
CREATE TABLE public.edge (
  EdgeID integer NOT NULL DEFAULT nextval('"edge_EdgeID_seq"'::regclass),
  CourseID integer NOT NULL,
  FromNodeID integer NOT NULL,
  ToNodeID integer NOT NULL,
  CreatedAt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT edge_pkey PRIMARY KEY (EdgeID),
  CONSTRAINT edge_CourseID_fkey FOREIGN KEY (CourseID) REFERENCES public.course(CourseID),
  CONSTRAINT edge_FromNodeID_fkey FOREIGN KEY (FromNodeID) REFERENCES public.node(NodeID),
  CONSTRAINT edge_ToNodeID_fkey FOREIGN KEY (ToNodeID) REFERENCES public.node(NodeID)
);
CREATE TABLE public.node (
  NodeID integer NOT NULL DEFAULT nextval('"node_NodeID_seq"'::regclass),
  CourseID integer NOT NULL,
  Title character varying NOT NULL,
  XP integer DEFAULT 100 CHECK ("XP" >= 0),
  X integer NOT NULL CHECK ("X" >= 0 AND "X" <= 800),
  Y integer NOT NULL CHECK ("Y" >= 0 AND "Y" <= 800),
  IconName character varying,
  Description text,
  Content text,
  CreatedAt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  TypeID integer,
  CONSTRAINT node_pkey PRIMARY KEY (NodeID),
  CONSTRAINT node_CourseID_fkey FOREIGN KEY (CourseID) REFERENCES public.course(CourseID),
  CONSTRAINT fk_node_type FOREIGN KEY (TypeID) REFERENCES public.tasktype(TypeID)
);
CREATE TABLE public.roles (
  RoleID integer NOT NULL,
  RoleName character varying NOT NULL,
  CONSTRAINT roles_pkey PRIMARY KEY (RoleID)
);
CREATE TABLE public.tag (
  TagID integer NOT NULL DEFAULT nextval('"tag_TagID_seq"'::regclass),
  Name character varying NOT NULL UNIQUE,
  CreatedAt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tag_pkey PRIMARY KEY (TagID)
);
CREATE TABLE public.tasktype (
  TypeID integer NOT NULL DEFAULT nextval('"tasktype_TypeID_seq"'::regclass),
  TypeName text NOT NULL,
  CONSTRAINT tasktype_pkey PRIMARY KEY (TypeID)
);
CREATE TABLE public.userachievement (
  AchievementID integer NOT NULL,
  UserID integer NOT NULL,
  Date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT userachievement_pkey PRIMARY KEY (AchievementID, UserID),
  CONSTRAINT userachievement_AchievementID_fkey FOREIGN KEY (AchievementID) REFERENCES public.achievement(AchievementID),
  CONSTRAINT userachievement_UserID_fkey FOREIGN KEY (UserID) REFERENCES public.USER(UserID)
);
CREATE TABLE public.userprogress (
  ProgressID integer NOT NULL DEFAULT nextval('"userprogress_ProgressID_seq"'::regclass),
  UserID integer NOT NULL,
  NodeID integer NOT NULL,
  Status character varying DEFAULT 'locked'::character varying CHECK ("Status"::text = ANY (ARRAY['locked'::character varying, 'unlocked'::character varying, 'completed'::character varying]::text[])),
  CompletedAt timestamp with time zone,
  CreatedAt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT userprogress_pkey PRIMARY KEY (ProgressID),
  CONSTRAINT userprogress_NodeID_fkey FOREIGN KEY (NodeID) REFERENCES public.node(NodeID),
  CONSTRAINT userprogress_UserID_fkey FOREIGN KEY (UserID) REFERENCES public.USER(UserID)
);
CREATE TABLE public.userrole (
  UserID integer NOT NULL,
  RoleID integer NOT NULL,
  CONSTRAINT userrole_pkey PRIMARY KEY (UserID, RoleID),
  CONSTRAINT userrole_UserID_fkey FOREIGN KEY (UserID) REFERENCES public.USER(UserID),
  CONSTRAINT userrole_RoleID_fkey FOREIGN KEY (RoleID) REFERENCES public.roles(RoleID)
);