<?xml version="1.0" encoding="UTF-8"?>
<Workflow xmlns="http://soap.sforce.com/2006/04/metadata">
    <alerts>
        <fullName>SDO_Service_CSAT_Survey</fullName>
        <description>Service - CSAT Survey</description>
        <protected>false</protected>
        <recipients>
            <field>ContactId</field>
            <type>contactLookup</type>
        </recipients>
        <senderType>CurrentUser</senderType>
        <template>SDO_Service_Templates/SDO_Service_Case_Closed_Email_Template_with_Salesforce_Survey</template>
    </alerts>
    <alerts>
        <fullName>SDO_Service_Case_Auto_Response</fullName>
        <description>SDO Service - Case Auto-Response</description>
        <protected>false</protected>
        <recipients>
            <field>ContactEmail</field>
            <type>email</type>
        </recipients>
        <recipients>
            <field>SuppliedEmail</field>
            <type>email</type>
        </recipients>
        <senderType>CurrentUser</senderType>
        <template>SDO_Service_Templates/SDO_Service_Auto_Response</template>
    </alerts>
    <alerts>
        <fullName>SDO_Service_Milestone_1st_Response_SUCCESSFUL</fullName>
        <description>Service - Milestone - First Response - SUCCESSFUL</description>
        <protected>false</protected>
        <recipients>
            <type>owner</type>
        </recipients>
        <senderType>CurrentUser</senderType>
        <template>SDO_Service_Entitlement_Milestone/SDO_Service_Milestone_1st_Response_Success</template>
    </alerts>
    <alerts>
        <fullName>SDO_Service_Milestone_1st_Response_VIOLATION</fullName>
        <description>Service - Milestone - First Response - VIOLATION</description>
        <protected>false</protected>
        <recipients>
            <type>owner</type>
        </recipients>
        <senderType>CurrentUser</senderType>
        <template>SDO_Service_Entitlement_Milestone/SDO_Service_Milestone_1st_Response_Violation</template>
    </alerts>
    <alerts>
        <fullName>SDO_Service_Milestone_1st_Response_Warning</fullName>
        <description>Service - Milestone - First Response - WARNING</description>
        <protected>false</protected>
        <recipients>
            <type>owner</type>
        </recipients>
        <senderType>CurrentUser</senderType>
        <template>SDO_Service_Entitlement_Milestone/SDO_Service_Milestone_1st_Response_Warning</template>
    </alerts>
    <alerts>
        <fullName>SDO_Service_Send_customer_satisfaction_survey</fullName>
        <description>Service - Send customer satisfaction survey</description>
        <protected>false</protected>
        <recipients>
            <field>ContactId</field>
            <type>contactLookup</type>
        </recipients>
        <senderType>CurrentUser</senderType>
        <template>SDO_Service_Templates/SDO_Service_Default_Email_Template</template>
    </alerts>
    <alerts>
        <fullName>SDO_Service_Trigger_Laptop_Email</fullName>
        <description>Service - Troubleshoot Audio Flow Confirmation</description>
        <protected>false</protected>
        <recipients>
            <field>ContactEmail</field>
            <type>email</type>
        </recipients>
        <senderType>CurrentUser</senderType>
        <template>SDO_Service_Templates/SDO_Service_Troubleshoot_Audio_Flow_Confirmation</template>
    </alerts>
    <fieldUpdates>
        <fullName>ChangePriorityToHigh</fullName>
        <field>Priority</field>
        <literalValue>High</literalValue>
        <name>Changes the case priority to high.</name>
        <notifyAssignee>false</notifyAssignee>
        <operation>Literal</operation>
        <protected>false</protected>
        <reevaluateOnChange>false</reevaluateOnChange>
    </fieldUpdates>
    <fieldUpdates>
        <fullName>SDO_Service_First_Contact_Close_box</fullName>
        <description>What: Check the &quot;First Contact Close&quot; box on the case.</description>
        <field>First_Contact_Close__c</field>
        <literalValue>1</literalValue>
        <name>Service - First Contact Close box</name>
        <notifyAssignee>false</notifyAssignee>
        <operation>Literal</operation>
        <protected>false</protected>
        <reevaluateOnChange>false</reevaluateOnChange>
    </fieldUpdates>
    <fieldUpdates>
        <fullName>SDO_Service_Mark_Case_as_Non_Compliant</fullName>
        <description>What: Mark SLA Compliant to non-compliant</description>
        <field>SDO_Service_SLA_Compliant__c</field>
        <literalValue>0</literalValue>
        <name>Service - Mark Case as Non-Compliant</name>
        <notifyAssignee>false</notifyAssignee>
        <operation>Literal</operation>
        <protected>false</protected>
        <reevaluateOnChange>false</reevaluateOnChange>
    </fieldUpdates>
    <fieldUpdates>
        <fullName>SDO_Service_Resume_SLA_Clock_on_Case</fullName>
        <description>What: Resume SLA Clock on Case. Not currently used</description>
        <field>IsStopped</field>
        <literalValue>0</literalValue>
        <name>Service - Resume SLA Clock on Case</name>
        <notifyAssignee>false</notifyAssignee>
        <operation>Literal</operation>
        <protected>false</protected>
        <reevaluateOnChange>false</reevaluateOnChange>
    </fieldUpdates>
    <fieldUpdates>
        <fullName>SDO_Service_Set_Case_Escalated_to_True</fullName>
        <description>What: Set case to escalated</description>
        <field>IsEscalated</field>
        <literalValue>1</literalValue>
        <name>Service - Set Case Escalated to True</name>
        <notifyAssignee>false</notifyAssignee>
        <operation>Literal</operation>
        <protected>false</protected>
        <reevaluateOnChange>false</reevaluateOnChange>
    </fieldUpdates>
    <fieldUpdates>
        <fullName>SDO_Service_Set_Case_Status_to_Escalated</fullName>
        <description>What: Set case to Escalated</description>
        <field>Status</field>
        <literalValue>Escalated</literalValue>
        <name>Service - Set Case Status to Escalated</name>
        <notifyAssignee>false</notifyAssignee>
        <operation>Literal</operation>
        <protected>false</protected>
        <reevaluateOnChange>false</reevaluateOnChange>
    </fieldUpdates>
    <fieldUpdates>
        <fullName>SDO_Service_Set_Case_Status_to_Working</fullName>
        <description>What: Set case to working</description>
        <field>Status</field>
        <literalValue>Working</literalValue>
        <name>Service - Set Case Status to Working</name>
        <notifyAssignee>false</notifyAssignee>
        <operation>Literal</operation>
        <protected>false</protected>
        <reevaluateOnChange>false</reevaluateOnChange>
    </fieldUpdates>
    <fieldUpdates>
        <fullName>SDO_Service_Set_Escalated_Flag</fullName>
        <description>What: Set Escalated Field to True</description>
        <field>IsEscalated</field>
        <literalValue>1</literalValue>
        <name>Service - Set Escalated Flag</name>
        <notifyAssignee>false</notifyAssignee>
        <operation>Literal</operation>
        <protected>false</protected>
        <reevaluateOnChange>false</reevaluateOnChange>
    </fieldUpdates>
    <fieldUpdates>
        <fullName>SDO_Service_Set_Origin_to_Community</fullName>
        <description>What: Set Case origin to community</description>
        <field>Origin</field>
        <literalValue>Community</literalValue>
        <name>Service - Set Origin to Community</name>
        <notifyAssignee>false</notifyAssignee>
        <operation>Literal</operation>
        <protected>false</protected>
        <reevaluateOnChange>false</reevaluateOnChange>
    </fieldUpdates>
    <fieldUpdates>
        <fullName>SDO_Service_Status_Waiting_on_Customer</fullName>
        <description>What: Status to Waiting on Customer</description>
        <field>Status</field>
        <literalValue>Waiting on Customer</literalValue>
        <name>Service - Status to Waiting on Customer</name>
        <notifyAssignee>false</notifyAssignee>
        <operation>Literal</operation>
        <protected>false</protected>
        <reevaluateOnChange>false</reevaluateOnChange>
    </fieldUpdates>
    <fieldUpdates>
        <fullName>SDO_Service_Stop_SLA_Clock_on_Case</fullName>
        <description>What: Stop SLA Clock on Case</description>
        <field>IsStopped</field>
        <literalValue>1</literalValue>
        <name>Service - Stop SLA Clock on Case</name>
        <notifyAssignee>false</notifyAssignee>
        <operation>Literal</operation>
        <protected>false</protected>
        <reevaluateOnChange>false</reevaluateOnChange>
    </fieldUpdates>
    <tasks>
        <fullName>SDO_Service_Milestone_1st_Response_Successful</fullName>
        <assignedToType>owner</assignedToType>
        <description>The 1st Response milestone for this case was SUCCESSFUL</description>
        <dueDateOffset>0</dueDateOffset>
        <notifyAssignee>false</notifyAssignee>
        <priority>High</priority>
        <protected>false</protected>
        <status>Completed</status>
        <subject>Service - Milestone - 1st Response - SUCCESSFUL</subject>
    </tasks>
    <tasks>
        <fullName>SDO_Service_Milestone_1st_Response_VIOLATION</fullName>
        <assignedToType>owner</assignedToType>
        <description>Milestone - 1st Response - VIOLATED</description>
        <dueDateOffset>0</dueDateOffset>
        <notifyAssignee>false</notifyAssignee>
        <priority>High</priority>
        <protected>false</protected>
        <status>Completed</status>
        <subject>Service - Milestone - 1st Response - VIOLATION</subject>
    </tasks>
    <tasks>
        <fullName>SDO_Service_Yourcustomerhadabillingquestion</fullName>
        <assignedToType>accountOwner</assignedToType>
        <dueDateOffset>0</dueDateOffset>
        <notifyAssignee>false</notifyAssignee>
        <priority>Normal</priority>
        <protected>false</protected>
        <status>Not Started</status>
        <subject>Service - Your customer had a billing question</subject>
    </tasks>
    <tasks>
        <fullName>SDO_Service_YourcustomerhasopenedaCase</fullName>
        <assignedToType>accountOwner</assignedToType>
        <dueDateOffset>0</dueDateOffset>
        <notifyAssignee>false</notifyAssignee>
        <priority>Normal</priority>
        <protected>false</protected>
        <status>Not Started</status>
        <subject>Service - Your customer has opened a Case</subject>
    </tasks>
</Workflow>
