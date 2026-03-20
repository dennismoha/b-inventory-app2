# About

This project is a custom inventory management system designed for a small shop. It includes:

- **Frontend**: Built using Next.js
- **Backend**: Built using Node.js and Express

### Branching Structure

- **Feature Branches**: Each feature is developed in a separate branch:
  - Frontend features are in branches named `frontend/feature/featurename`.
  - Backend features are in branches named `backend/feature/featurename`.
  
- **Main Branch**: The `main` branch contains the final, stable code.

- **Development Flow**:
  - All feature branches are rebased from the `develop` branch.
  - All pull requests (PRs) are made to the `develop` branch.

### Notes

- The `docs` folder is not relevant for the project and can be ignored.
- Both the backend and frontend contain detailed `README.md` files explaining the project structure and how to run the application.
- The entire project is written in TypeScript.


# Deployment Guide

## Overview
The deployment is managed using GitHub Actions.

### Backend Deployment

- The backend is deployed on Render through GitHub Actions.
- To see how the deployment works, navigate to the **GitHub Actions workflows** in the repository.
- The `server.yml` workflow is responsible for deploying the backend code to Render.

### Deployment Considerations

1. **Do not add `NODE_ENV` when deploying on Render**  
   Adding `NODE_ENV` may cause issues with `tsc` (TypeScript Compiler), as noted in this [Render community post](https://community.render.com/t/tsc-not-found-during-build/6428).

2. **Setting up GitHub Actions for Render Deployment**  
   For a complete guide on how to set up GitHub Actions for deployment to Render, check out this official Render documentation:  
   [Deploy to Render from GitHub Actions](https://render.com/docs/cli?_gl=1*vyo77d*_gcl_au*MTY5Nzk3NzExOS4xNzMxOTM1NjQw*_ga*NTQzNzk3MjQ4LjE3MTY0OTU5ODI.*_ga_QK9L9QJC5N*MTczNjU4MzA3MC4yNi4xLjE3MzY1ODM2MTYuNjAuMC4w#example-github-actions)

3. **Finding the Render Service ID**  
   If you're having trouble finding the Render service ID, follow the instructions in this video:  
   [YouTube: How to get Render Service ID](https://www.youtube.com/embed/DBlmF91Accg?si=Ze1lKvN6zpphtwiE&amp;start=458)

4. **Render API Key**  
   To interact with the Render API, you can find the necessary documentation and instructions here:  
   [Render API Documentation](https://render.com/docs/api)

5. **Setting Up PostgreSQL on Render**  
   To set up a PostgreSQL database on Render and retrieve the database URL, follow these instructions:  
   [Render PostgreSQL Setup Guide](https://render.com/docs/postgresql-creating-connecting#create-your-database)

---

### Frontend Deployment

- The frontend deployment is managed by the `frontend.yml` workflow.
- The workflow file can be found in the **workflows** folder of the repository.

so the table will be like :
   1 bag of productx isequivalent to 50kgs of productx therefore 1 kg of productx goesfor 50bob therefore a bag will go for 50*50=200bob

   so to break it down
   1 - unitquantity
   bag-units


so i see how to solve it but I am unable to put this though process in line.    to solve the whole problem what we do is we have a lookup table of conversion. kgs to bags

so everything is saved in bags as it is at the moment. 
in the middle of it we have a lookup conversion table. like 1 bag of productx isEquivalent to 50kgs. and if 1 bag of productx goes for 2500kshs then 1kg goes for 50 since it's 2500/50 =  50kes.

so when seller sells 7kgs then all we have to do is convert bags to kgs. assuming we have 10 bags and each bag is 50kgs each then total kgs we have is 50*10 = 500kgs
then 500kgs - 7kgs = 493kgs
then 493kgs / 50kgsper bag = 9.86bags remaining.
then the price of the 7kgs = 50*7 = 350kes.

now assuming the seller sells 16kgs next then what we have is 493 - 16kgs = 477remaining kgs. now 477/50 =9.54 bags.
now price becomes 16kgs * 50 = 800kes

now assuming he sells 9.5kgs then we have the remaining 9.54 bags
so all we have is 9.54bags *50 = 477
now 477kgs - 9.5 = 467.5kgs
now 467.5kgs / 50  = 9.35 bags.
now 9.5 * 50 = 475 kes.

conclusion:
 now we have  9.35 bags *2500per bag === 23,375
 would we have sold all 10 bags that would bcome = 10 *2500 = 25000kes

 now looking at the balance we have  = 25000 - 23375 = 1625kes
 now let's do the summation of what is sold ==  800 + 475 +350 = 1625kes. 

 so changes:
   the seller needs to convert kgs to bags before entering the data.
   so he needs to know that if a user asks for 7kgs then that's 0.14 kgs. this is what he needs to enter

   what happens if a user requests for 55 kgs . this is equivalent to 1 bag and 5kgs. what will the user enter :
    remember we are dealing with bags so this might be misinterpreted as 55bags instead of 55kgs
    This introduces some level of complexity :


so the solution to this is having a conversion for everything in kgs when sending it from the backend. so if the user enters 55 then we interprete that as 55kgs.then we can do a quick kgs to bags conversion on side . but each object will have a base unit vs the unit rep so that we can quickly do the math. 
so what goes to the backend is the bag quantity plus the equivalent kgs so that we can counter check.
so if user enters 7 we know that is 7kgs which is 0.14 of a sack. so for 7 sacks they have to enter 350 which is equivalent to 350kgs.
 so we should have a base unit for each eg in this scenario it's kgs and the price set agains this base table. then another lookup table for price conversion for each eg kgs to bags etc