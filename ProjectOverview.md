# SkillMaster: Project Overview

## 1. Project Vision

**SkillMaster** is a gamified learning platform designed to solve the problem of unstructured self-learning. While there are many resources available online for skills like programming, photography, or languages, learners often lack a systematic path to follow.

SkillMaster replaces linear course lists with  **Interactive Skill Trees** . This allows users to visualize their growth, unlock new abilities (nodes) only after mastering prerequisites, and track their journey through Experience Points (XP) and Levels.

## 2. Core Concept: The Skill Tree

Unlike traditional LMS (Learning Management Systems) that use lists or folders, SkillMaster uses a  **Graph-based Learning Model** .

* **The Tree** : A visual map of a specific domain (e.g., "Full Stack Web Dev" or "Latte Art").
* **The Node** : A single unit of learning. A node represents a specific task or concept (e.g., "Learn Loops" or "Steam Milk").
* **The Edge (Dependency)** : The connecting line that dictates order. You cannot attempt the "Advanced CSS" node until you have completed the "HTML Basics" node.

### The "Unlock" Loop

1. **Locked (Gray)** : Nodes that cannot be accessed yet because prerequisites are incomplete.
2. **Unlocked (Yellow)** : Nodes that are available to start. The learner clicks these to view instructions.
3. **In Progress** : The learner has started the task but hasn't submitted proof yet.
4. **Completed (Green)** : The learner submitted their work (URL, file, or text), and the system recorded it. This action unlocks the next set of nodes.

## 3. User Roles

### A. The Learner (User)

The primary user who wants to acquire new skills.

* **Dashboard** : See their current Level, Total XP, and active Skill Trees.
* **Action** : They "equip" a Skill Tree to their profile.
* **Submission** : They complete tasks by uploading proofs (e.g., a GitHub link for code, a photo for art).
* **Gamification** :
* **XP** : Earned per completed node.
* **Level** : Calculated based on total XP.
* **Achievements** : Special badges (e.g., "Completed 5 Trees", "First Perfect Score").

### B. The Content Designer

The architect who builds the curriculum.

* **Studio Interface** : A drag-and-drop editor to create nodes and draw lines (dependencies) between them.
* **Content Management** : They define what constitutes a "Task" (Reading, Quiz, or Project) and set the XP reward for each node.
* **Quality Control** : They can view learner submissions to improve the course content.

## 4. System Features Breakdown

| **Feature Category**  | **Details**                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Authentication**    | Secure Login/Register. Separation of Learner and Designer privileges.                                         |
| **Tree Engine**       | The core logic that calculates which nodes are accessible based on `NodePrerequisites`and `UserProgress`. |
| **Progress Tracking** | Persistent storage of every completed node, score, and timestamp.                                             |
| **Gamification**      | Real-time updates of XP and Leveling up. Achievement system based on criteria.                                |
| **Social**            | Course Rating system (Stars & Comments) to help users find high-quality trees.                                |
| **Submission System** | A record of*what*the user did to pass a node (Files/Links), tied to a specific timestamp.                   |

## 5. Why this Project is Unique

Most course platforms (Udemy, Coursera) are linear. **SkillMaster** allows for  **non-linear progression** . A single "Basics" node might branch into three different paths (e.g., "Frontend", "Backend", "DevOps"), allowing the user to choose their specialization while still seeing the "Big Picture" of the skill domain.
