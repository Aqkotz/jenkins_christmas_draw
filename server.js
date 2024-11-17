import express from 'express';
import sgMail from '@sendgrid/mail';
import { randomInt } from 'crypto';

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(express.json());

// Hardcoded data
const families = [
    ["Ashley and Jens", "Mark P and Karen", "George and Mary Katherine", "Louisa and Branden"],
    ["David and Pam", "Mara", "Andy", "John"],
    ["Doe and Mark G", "Isabelle and Spencer", "Taylor and Laura", "Daniel"],
    ["Cindy", "Erin and Grant"],
];

const emailMap = {
    "Amy": "aejenkins1263@gmail.com",
    "Ashley": "kashleyphillips@gmail.com",
    "Jens": "jens.blomdahl@gmail.com",
    "Daniel": "danielrobertgeorge@gmail.com",
    "David": "dfkotz@mac.com",
    "Pam": "pcjenkins@mac.com",
    "Doe": "doe.jenkins@gmail.com",
    "Mark G": "mgeorge2@icloud.com",
    "Erin": "mehaley88@gmail.com",
    "Grant": "grantcox.mail@gmail.com",
    "George": "george.m.phillipsjr@gmail.com",
    "Mary Katherine": "marykatherine.hall@gmail.com",
    "Isabelle": "isabel_eich@hotmail.com",
    "Spencer": "scistone9@gmail.com",
    "John": "jkotzlyme@gmail.com",
    "Louisa": "louisaphillips17@gmail.com",
    "Branden": "Branden.skarpiak@gmail.com",
    "Mara": "marakkotz@gmail.com",
    "Mark P": "mark.phillips@nelsonmullins.com",
    "Karen": "phillipskj10@gmail.com",
    "Taylor": "Tbhaynes91@gmail.com",
    "Laura": "lageorge430@gmail.com",
    "Cindy": "llucindajenkins@gmail.com",
    "Andy": "andy.lyme@icloud.com",
};

const giftersMap = {
    "Amy": ["Amy"],
    "Ashley and Jens": ["Ashley", "Jens"],
    "Daniel": ["Daniel"],
    "David and Pam": ["David", "Pam"],
    "Doe and Mark G": ["Doe", "Mark G"],
    "Erin and Grant": ["Erin", "Grant"],
    "George and Mary Katherine": ["George", "Mary Katherine"],
    "Isabelle and Spencer": ["Isabelle", "Spencer"],
    "John": ["John"],
    "Louisa and Branden": ["Louisa", "Branden"],
    "Mara": ["Mara"],
    "Mark P and Karen": ["Mark P", "Karen"],
    "Taylor and Laura": ["Taylor", "Laura"],
    "Cindy": ["Cindy"],
    "Andy": ["Andy"],
};

// Helper function to send an email
async function sendEmail(gifter, recipient, assignments, testingMode) {
    const emails = testingMode ? ["andy.lyme@mac.com"] : giftersMap[gifter].map(name => emailMap[name]);
    const drawnBy = Object.keys(assignments).find(key => assignments[key] === gifter) || "Unknown -- Contact Andy";

    const htmlContent = `
        <strong>Hello ${gifter}!</strong>
        <p>Your gift recipient for this year's Jenkins Family Christmas is: <strong>${recipient}</strong>.</p>
        <p>You were drawn by: <strong>${drawnBy}</strong>.</p>
        <p>If there are any issues, please contact Andy at <a href="mailto:andy.lyme@mac.com">andy.lyme@mac.com</a>.</p>
        <p>Happy Holidays!</p>
    `;

    const message = {
        to: emails,
        from: "andy.lyme@mac.com",
        subject: 'Your Jenkins Family Christmas Gift Assignment',
        html: htmlContent,
    };

    try {
        await sgMail.send(message);
        console.log(`Email sent to: ${emails.join(', ')}`);
    } catch (error) {
        console.error(`Error sending email: ${error}`);
    }
}

// Generate gift assignments
function generateGiftAssignments() {
    const participants = Object.keys(giftersMap);

    // Create family lookup for constraints
    const familyLookup = families.reduce((acc, family, idx) => {
        family.forEach(member => (acc[member] = idx));
        return acc;
    }, {});

    // Build adjacency matrix (graph)
    const graph = {};
    participants.forEach((gifter) => {
        graph[gifter] = participants.filter(
            (recipient) =>
                gifter !== recipient && familyLookup[gifter] !== familyLookup[recipient]
        );
    });

    // Find a Hamiltonian cycle
    const visited = new Set();
    const assignments = {};
    let startNode = participants[randomInt(participants.length)];

    function findHamiltonianCycle(currentNode, path) {
        if (path.length === participants.length) {
            if (graph[currentNode].includes(startNode)) {
                path.push(startNode); // Close the cycle
                return path;
            }
            return null;
        }

        for (const neighbor of graph[currentNode]) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                const result = findHamiltonianCycle(neighbor, [...path, neighbor]);
                if (result) return result;
                visited.delete(neighbor); // Backtrack
            }
        }
        return null;
    }

    visited.add(startNode);
    const cycle = findHamiltonianCycle(startNode, [startNode]);

    if (!cycle) {
        console.error("Error: Constraints make a valid assignment impossible.");
        return null;
    }

    // Generate assignments from the Hamiltonian cycle
    for (let i = 0; i < cycle.length - 1; i++) {
        assignments[cycle[i]] = cycle[i + 1];
    }

    return assignments;
}

// API endpoint
app.post('/generate-assignments', async (req, res) => {
    const { testingMode } = req.body;

    if (typeof testingMode !== 'boolean') {
        return res.status(400).json({ message: "Invalid 'testingMode' value. It must be a boolean." });
    }

    const assignments = generateGiftAssignments();
    if (!assignments) {
        return res.status(400).json({ message: "Failed to generate valid assignments." });
    }

    console.log("Gift Assignments:");
    console.log(assignments);

    if (testingMode) {
        console.log("Testing Mode Active:");
        console.log(assignments);
    }

    for (const [gifter, recipient] of Object.entries(assignments)) {
        console.log(`Sending email... Gifter: ${gifter}, Recipient: ${recipient}`);
        await sendEmail(gifter, recipient, assignments, testingMode);
    }

    res.json({ message: "Gift assignments generated and emails sent." });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
