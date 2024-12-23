"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { appwriteConfig } from "../appwrite/config";
import { parseStringify } from "../utils";
import { cookies } from "next/headers";
import { avatarPlaceholderUrl } from "@/constants";
import { redirect } from "next/navigation";


const getUserByEmail = async (email: string) => {
    const { databases } = await createAdminClient();

    const result = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        [Query.equal("email", [email])]
    );

    return result.total > 0 ? result.documents[0] : null;
};


const handleError = (error: unknown, message: string) => {
    console.log(error, message);
    throw error;
}
export const sendEmailOTP = async ({email}: {email: string}) => {
    const { account } = await createAdminClient();

    try {
        const session = await account.createEmailToken(ID.unique(), email);

        return session.userId;
    } catch (error) {
        handleError(error, "Failed to send email OTP");
    }
};
export const createAccount = async ({ 
    fullName, 
    email 
}: {
    fullName: string; 
    email: string;
}) => {
    const existingUser = await getUserByEmail(email);

    const accountId = await sendEmailOTP({ email });
    if(!accountId) throw new Error ("Failed to send an OTP");

    if(!existingUser) {
        const { databases } = await createAdminClient();

        await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            ID.unique(),
            {
                fullName,
                email,
                avatar: avatarPlaceholderUrl,
                accountId,
            },
        );
    }

    return parseStringify({ accountId })
};

export const verifySecret = async ({
     accountId,
      password,
    }: {
        accountId: string; 
        password: string;
    }) => {
        try {
            const { account } = await createAdminClient();

            const session = await account.createSession(accountId, password);

            (await cookies()).set("appwrite-session", session.secret, {
                path: "/",
                httpOnly: true,
                sameSite: "strict",
                secure: true,
            });

            return parseStringify({ sessionId: session.$id });

        } catch (error) {
            handleError(error, "Failed to verify OTP");
        }

    
}

export const getCurrentUser = async () => {
    const { databases, account } = await createSessionClient();

    const reuslt = await account.get();

    const user = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        [Query.equal("accountId", reuslt.$id)],
    );

    if(user.total <= 0) return null;

    return parseStringify(user.documents[0]);
};

export const signOutUser = async () => {
    const { account } = await createSessionClient();
    try {
        await account.deleteSession("current");
        (await cookies()).delete("appwrite-session");
    } catch (error) {
        handleError(error, "Failed to sign out user");
    } finally {
        redirect("/sign-in");
    }
};

export const signInUser = async ({ email }: { email: string }) => {
    try {
        const existingUser = await getUserByEmail(email);

        if (existingUser) {
            await sendEmailOTP({ email });
            return parseStringify({ accountId: existingUser.accountId });
        }

        return parseStringify({ accountId: null, error: "User not found" });
    } catch (error) {
        handleError(error, "Failed to sign in user");
    }
}

export async function getTotalSpaceUsed() {
    try {
      const { databases } = await createSessionClient();
      const currentUser = await getCurrentUser();
      if (!currentUser) throw new Error("User is not authenticated.");
  
      const files = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.filesCollectionId,
        [Query.equal("owner", [currentUser.$id])],
      );
  
      const totalSpace = {
        image: { size: 0, latestDate: "" },
        document: { size: 0, latestDate: "" },
        video: { size: 0, latestDate: "" },
        audio: { size: 0, latestDate: "" },
        other: { size: 0, latestDate: "" },
        used: 0,
        all: 2 * 1024 * 1024 * 1024 /* 2GB available bucket storage */,
      };
  
      files.documents.forEach((file) => {
        const fileType = file.type as FileType;
        totalSpace[fileType].size += file.size;
        totalSpace.used += file.size;
  
        if (
          !totalSpace[fileType].latestDate ||
          new Date(file.$updatedAt) > new Date(totalSpace[fileType].latestDate)
        ) {
          totalSpace[fileType].latestDate = file.$updatedAt;
        }
      });
  
      return parseStringify(totalSpace);
    } catch (error) {
      handleError(error, "Error calculating total space used:, ");
    }
  }
