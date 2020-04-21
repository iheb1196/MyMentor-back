const express = require('express')
const bodyParser = require('body-parser')
const mongodb = require('mongodb')
const ObjectId = require('mongodb').ObjectId
const bcrypt = require('bcrypt-node') // to hash the passwords  
const jwt = require('jsonwebtoken') // for security
const nodemailer = require('nodemailer')
const app = express()

app.use(bodyParser.json())

const connection = (closure) => {
    return mongodb.connect('mongodb://localhost:27017/mentorDb', { useUnifiedTopology: true }, (err, client) => {
        if (err) throw err;
        let db = client.db('mentorDb')
        closure(db)
    })
}

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.post('/login', (req, res) => {
    connection(async (db) => {
        const user = await db.collection('user').findOne({ email: req.body.email })
        if (!user) { return res.send({ msg: 'bad email' }) };
        if (!bcrypt.compareSync(req.body.password, user.password)) { return res.send({ msg: 'bad password' }) }
        user.password = '';
        return res.send({ msg: 'ok', user, token: jwt.sign({ user }, 'mySuperSecretString', { expiresIn: '7d' }) })
    })
})
app.post('/addUser', (req, res) => {
    
    console.log(req.body.email)
    connection(async (db) => {
        const userResult=await db.collection('user').findOne({email:req.body.email,role:req.body.role})
        
        if(userResult){return res.send({msg:'this is user is already added'})}
        if(req.body.email.length === 0){return res.send({msg:'please enter your email'})}
        req.body.password = bcrypt.hashSync(req.body.password)
        
        const user = await db.collection('user').insert(req.body)
        return res.send({ msg: 'user added', user })
    })
})

app.post('/addRequest', (req, res) => {
    console.log(req.body)
    console.log(req.body.professorEmail)
    connection(async (db) => {
        
        const mentorResult = await db.collection('requests').findOne({ email: req.body.email, availibility: req.body.availibility, availibilityTime: req.body.availibilityTime })
        if( req.body.professorEmail.length === 0 && req.body.availibility.length === 0&& req.body.availibilityTime.length ===0 && req.body.course.length === 0 ){ return res.send({ msg: ' Please  fill  up  BE  A  MENTOR  form ' }) }
        if( req.body.professorEmail.length === 0 && req.body.availibility.length === 0&& req.body.availibilityTime.length ===0  ){ return res.send({ msg: 'Please  fill  up  the  missing  field  :  ProfessorEmail  ,  AvaibilityTime  and  AvaibilityDate ' }) }
        if( req.body.professorEmail.length === 0 && req.body.availibility.length === 0){ return res.send({ msg: 'Please fill up the missing fields :ProfessorEmail and AvaibilityTime+ ' }) }
        if( req.body.professorEmail.length === 0  ){ return res.send({ msg: 'Please fill up the missing fields : AvailibilityDate ,AvailibilityTime and Course ' }) }
       
        if( req.body.availibility.length === 0&& req.body.availibilityTime.length ===0 && req.body.course.length === 0 ){ return res.send({ msg: ' Please  fill  up  the  missing  field  :  AvailibilityDate  ,  AvailibilityTime  and  Course ' }) }
        
        
        if(  req.body.availibility.length === 0&& req.body.availibilityTime.length ===0  ){ return res.send({ msg: 'Please  fill  up  the  missing  fields  :  AvailibilityDate  and   AvailibilityTime ' }) }
        if(  req.body.availibility.length === 0){ return res.send({ msg: 'Please  fill  up  the  missing  flied :  AvailibilityDate ' }) }
        
        if( req.body.professorEmail.length === 0 &&  req.body.availibilityTime.length ===0 && req.body.course.length === 0 ){ return res.send({ msg: 'Please  field  up  the  missing  fields  :  ProfessorEmail  ,  AvailibilityTime  and  Course ' }) }
        if(  req.body.availibilityTime.length ===0 && req.body.course.length === 0 ){ return res.send({ msg: 'Please  field  up  the  missing  fields  :  AvailibilityTime  and  Course ' }) }
        if(  req.body.availibilityTime.length ===0  ){ return res.send({ msg: 'Please  fill  up  the  missing  field  :  AvailibilityTime ' }) }

        if( req.body.professorEmail.length === 0 && req.body.availibility.length === 0&& req.body.course.length === 0 ){ return res.send({ msg: 'Please fill up the missing fields:ProfessorEmail, AvailibilityDate and Course ' }) }
        if( req.body.professorEmail.length === 0 &&  req.body.course.length === 0 ){ return res.send({ msg: 'Please  fill  up  the  missing  fields  :  ProfessorEmail  and  Course' }) }
        if(  req.body.course.length === 0 ){ return res.send({ msg: 'Please  fill  up  the  missing  field  :  Course ' }) }
        if (mentorResult) { return res.send({ msg: 'exist' }) }

        req.body['date'] = Date.now()
        req.body['state'] = 'pending'

        const mentor = await db.collection('requests').insert(req.body)
        return res.send({ msg: 'ok', mentor })
    })
})

app.get('/getProfessorsEmails', (req, res) => {
    connection(async (db) => {
        const emails = await db.collection('user').find({ role: 'professor' }).toArray()
        return res.send({ msg: 'ok', emails: emails })
    })
})

app.post('/listMentors', (req, res) => {
    connection(async (db) => {
        let mentors = []
        if (req.body.course !== '') {
            mentors = await db.collection('mentors').find({ course: req.body.course }).toArray();
        } else {
            mentors = await db.collection('mentors').find().toArray();
        }
        const users = await db.collection('mentors').find().toArray();
        const mentorsData = await mentors.map(m => ({ ...m, user: users.filter(u => u.email === m.email)[0] }))
        return res.send({ msg: 'ok', users: mentorsData })
    })
})

app.post('/listRequest', (req, res) => {
    connection(async (db) => {

        const result = await db.collection('requests').find({ professorEmail: req.body.email, state: 'pending' }).toArray();

        return res.send(result)
    })
})
app.post('/sessions', (req, res) => {
    connection(async (db) => {
        const users = await db.collection('mentors').find().toArray();
        return res.send(users);
        const result = await db.collection('requests').find({ sessions: req.body.email, state: 'accepted' }).toArray();
        return res.send(result.map(r => ({ ...r, user: users.filter(u => u.email === r.email)[0] })))
    })
})
app.post('/addUserRequest', (req, res) => {
    connection(async (db) => {
        console.log(req.body.requestId, req.body.userId)
        const result = await db.collection('mentors').updateOne({ _id: ObjectId(req.body.requestId) }, { $push: { sessions: req.body.userId } });
        // return res.send(result.map(r => ({ ...r, user: users.filter(u => u.email === r.email)[0] })))
        return res.send({ msg: 'OK',result });
    })
})


app.post('/updateReview', (req, res) => {
    console.log(req.body)
    connection(async (db) => {
        const result = await db.collection('mentors').findOne({ _id: ObjectId(req.body._id)});
        console.log(result)
        if (!result.reviews) result.reviews = 0;
        if (!result.score) result.score = 0;
        result.reviews = result.reviews + 1;
        result.score = Math.round((req.body.score * 1 + result.score) / result.reviews);
        console.log(result);
        const updateResult = await db.collection('mentors').updateOne({  _id: ObjectId(req.body._id) }, { $set: { score: result.score, reviews: result.reviews } });
         console.log(updateResult)
        return result;
    })
})

app.post('/updateRequest', (req, res) => {
    connection(async (db) => {
        const request = await db.collection('requests').findOne({ _id: ObjectId(req.body._id) })
        const result = await db.collection('requests').update({ _id: ObjectId(req.body._id) }, { $set: { state: req.body.state } });
        if (req.body.state === 'accepted') {
            request['date'] = Date.now()
            await db.collection('user').updateOne({ email: request.email }, { $set: { role: 's-mentor' } });
            const mentor = await db.collection('mentors').insert(
                {
                    name:request.name,
                    lastname:request.lastname,
                    email: request.email,
                    date: Date.now(),
                    message: request.message,
                    availibility: request.availibility,
                    availibilityTime: request.availibilityTime,
                    course: request.course,
                    

                })
        }
        return res.send(result)
    })
})

app.post('/addMentor', (req, res) => {
    connection(async (db) => {
        req.body['date'] = Date.now()
        await db.collection('user').updateOne({ email: req.body.email }, { $set: { role: 's-mentor' } });
        const mentor = await db.collection('mentors').insert(
            {
                email: req.body.email,
                date: Date.now(),
                message: req.body.message,
                availibility: req.body.availibility
            })
        return res.send({ msg: 'ok', mentor })
    })
})

app.get('/sendEmail', async (req, res) => {
    await sendEmail('hello', 'this is a test')
    res.send({ msg: 'mail sent' })
})

const sendEmail = async (sub, body) => {
    const connection = nodemailer.createTransport({
        host: "smtp.office365.com",
        port: 587,
        secure: true, // upgrade later with STARTTLS
        auth: {
            user: "iheb.jendoubi@medtech.tn",
            pass: "NodeTestPassword12345"
        }
    });
    const message = {
        from: "iheb.jendoubi@medtech.tn",
        to: "nour@medtech.tn",
        subject: sub,
        text: "",
        html: body
    };
    return await connection.sendMail(message)
}

app.listen(3000, (err) => {
    if (err) throw err;
    console.log('server is running on port 3000')
})